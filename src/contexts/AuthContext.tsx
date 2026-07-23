// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Platform } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { firebaseAuth, db } from '../services/firebaseConfig';
import { AuthState, Gender, User } from '../types';

interface AuthContextValue extends AuthState {
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfileData: (profileData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const defaultAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isNewUser: false,
};

const sanitizeText = (value: string, maxLength = 80): string =>
  value.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);

const sanitizeStringArray = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => sanitizeText(value, 40)).filter(Boolean)));

// Gün anahtarı (YYYY-MM-DD, UTC) — seri hesabında tutarlılık için
const dateKeyUTC = (d: Date): string => d.toISOString().slice(0, 10);

// Ardışık gün serisini hesaplar: dün girildiyse +1, bugün zaten girildiyse aynı, aksi halde sıfırlanır (1).
const computeStreak = (lastActiveDate: string | undefined, prevStreak: number | undefined): number => {
  const today = dateKeyUTC(new Date());
  if (!lastActiveDate) return 1;
  if (lastActiveDate === today) return prevStreak && prevStreak > 0 ? prevStreak : 1;
  const yesterday = dateKeyUTC(new Date(Date.now() - 24 * 60 * 60 * 1000));
  if (lastActiveDate === yesterday) return (prevStreak ?? 0) + 1;
  return 1;
};

GoogleSignin.configure({
  webClientId: '681199810177-9pecsef70hbqpb2rafr9nhd8bh32gf1c.apps.googleusercontent.com', // Firebase projenizden alınan webClientId
  offlineAccess: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);

  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        setAuthState({ user: null, isAuthenticated: false, isLoading: false, isNewUser: false });
        return;
      }

      try {
        const userDocRef = db.collection('users').doc(firebaseUser.uid);
        const userDoc = await userDocRef.get();
        const todayKey = dateKeyUTC(new Date());

        let isNewData = false;
        let firestoreData = userDoc.exists() ? userDoc.data() : null;
        let streakCount = 1;

        if (!userDoc.exists()) {
          isNewData = true;
          firestoreData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            displayName: sanitizeText(firebaseUser.displayName ?? 'Oyuncu', 40),
            createdAt: new Date().toISOString(),
            avatarId: 'avatar-1',
            heightCm: null,
            weightKg: null,
            gender: null,
            hobbies: [],
            musicGenres: [],
            totalScore: 0,
            gamesPlayed: 0,
            gamesWon: 0,
            isOnline: true,
            blockedUsers: [],
            bio: '',
            streakCount: 1,
            lastActiveDate: todayKey,
          };
          await userDocRef.set(firestoreData);
        } else {
          // Ardışık gün serisini hesapla ve online durumunu güncelle
          streakCount = computeStreak(firestoreData?.lastActiveDate, firestoreData?.streakCount);
          await userDocRef.update({
            isOnline: true,
            lastLogin: firestore.FieldValue.serverTimestamp(),
            streakCount,
            lastActiveDate: todayKey,
          });
        }

        const profile: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          displayName: sanitizeText(firebaseUser.displayName ?? firestoreData?.displayName ?? 'Oyuncu', 40),
          createdAt: firestoreData?.createdAt ?? new Date().toISOString(),
          avatarId: firestoreData?.avatarId ?? 'avatar-1',
          heightCm: firestoreData?.heightCm ?? null,
          weightKg: firestoreData?.weightKg ?? null,
          gender: (firestoreData?.gender as Gender | null) ?? null,
          hobbies: sanitizeStringArray(firestoreData?.hobbies ?? []),
          musicGenres: sanitizeStringArray(firestoreData?.musicGenres ?? []),
          totalScore: firestoreData?.totalScore ?? 0,
          gamesPlayed: firestoreData?.gamesPlayed ?? 0,
          gamesWon: firestoreData?.gamesWon ?? 0,
          isOnline: true,
          blockedUsers: firestoreData?.blockedUsers ?? [],
          bio: firestoreData?.bio ?? '',
          streakCount,
          lastActiveDate: todayKey,
        };

        setAuthState({
          user: profile,
          isAuthenticated: true,
          isLoading: false,
          isNewUser: isNewData,
        });
      } catch (error) {
        console.error('Firestore profil yükleme hatası:', error);
        setAuthState({ user: null, isAuthenticated: false, isLoading: false, isNewUser: false });
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<void> => {
  setAuthState((prev) => ({ ...prev, isLoading: true }));
  try {
    if (Platform.OS === 'web') {
      throw new Error('Google girişi bu platformda desteklenmiyor.');
    }

    // Native kuyruğu tıkamaması için signOut() çağrısını buradan tamamen kaldırdık.
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const signInResult = await GoogleSignin.signIn();

    const idToken = signInResult?.data?.idToken || (signInResult as any)?.idToken;

    if (!idToken) {
      throw new Error('Google idToken alınamadı. SHA-1 ve webClientId ayarlarını kontrol edin.');
    }

    const { accessToken } = await GoogleSignin.getTokens();

    if (!accessToken) {
      throw new Error('Google accessToken alınamadı.');
    }

    const realCredential = auth.GoogleAuthProvider.credential(idToken, accessToken);

    await firebaseAuth.signInWithCredential(realCredential);
  } catch (error: any) {
    console.error('Google login hatası:', error);
    setAuthState((prev) => ({ ...prev, isLoading: false }));

    if (error.code === 'SIGN_IN_CANCELLED') {
      return;
    }
    throw error;
  }
};

  const loginWithApple = async (): Promise<void> => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));
    try {
      if (Platform.OS !== 'ios') {
        throw new Error('Apple girişi yalnızca iOS üzerinde desteklenir.');
      }

      const appleResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      if (!appleResponse.identityToken) {
        throw new Error('Apple kimlik jetonu alınamadı.');
      }

      const credential = auth.AppleAuthProvider.credential(
        appleResponse.identityToken,
        appleResponse.authorizationCode ?? undefined
      );

      await firebaseAuth.signInWithCredential(credential);
    } catch (error) {
      console.error('Apple login hatası:', error);
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      if (authState.user) {
        await db.collection('users').doc(authState.user.uid).update({
          isOnline: false,
        });
      }
      await firebaseAuth.signOut();
    } catch (error) {
      console.error('Çıkış yaparken hata:', error);
    }
  };

  const updateProfileData = async (profileData: Partial<User>): Promise<void> => {
    if (!authState.user) throw new Error('Kullanıcı oturum açmamış.');

    const activeUid = firebaseAuth.currentUser?.uid;
    if (!activeUid || activeUid !== authState.user.uid) {
      throw new Error('Güvenlik/Yetkilendirme hatası.');
    }

    const sanitizedProfileData: Partial<User> = { ...profileData };
    if (typeof sanitizedProfileData.displayName === 'string') {
      sanitizedProfileData.displayName = sanitizeText(sanitizedProfileData.displayName, 40);
    }
    if (Array.isArray(sanitizedProfileData.hobbies)) {
      sanitizedProfileData.hobbies = sanitizeStringArray(sanitizedProfileData.hobbies);
    }
    if (Array.isArray(sanitizedProfileData.musicGenres)) {
      sanitizedProfileData.musicGenres = sanitizeStringArray(sanitizedProfileData.musicGenres);
    }

    await db.collection('users').doc(authState.user.uid).set(sanitizedProfileData, { merge: true });

    setAuthState((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...sanitizedProfileData } : null,
      isNewUser: false,
    }));
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      ...authState,
      loginWithGoogle,
      loginWithApple,
      signOut,
      updateProfileData,
    }),
    [authState]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth bir AuthProvider içinde kullanılmalıdır.');
  return context;
};