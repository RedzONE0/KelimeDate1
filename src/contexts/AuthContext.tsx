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

GoogleSignin.configure({
  webClientId: '681199810177-9pecsef70hbqpb2rafr9nhd8bh32gf1c.apps.googleusercontent.com',
  offlineAccess: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);

  useEffect(() => {
    console.log('🟢 LISTENER KURULDU');
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
      console.log('🟡 TETİKLENDİ! firebaseUser:', firebaseUser ? firebaseUser.uid : 'NULL');
      if (firebaseUser) {
        try {
          console.log('🟡 Firestore get() çağrılıyor...');
          const userDocRef = db.collection('users').doc(firebaseUser.uid);
          const userDoc = await userDocRef.get();
          console.log('🟢 Firestore get() TAMAMLANDI. exists:', userDoc.exists());

          let isNewData = false;
          let firestoreData = userDoc.exists() ? userDoc.data() : null;

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
            };
            console.log('🟡 Firestore set() (yeni kullanıcı) çağrılıyor...');
            await userDocRef.set(firestoreData);
            console.log('🟢 Firestore set() TAMAMLANDI');
          } else {
            console.log('🟡 Firestore update() çağrılıyor...');
            try {
              await userDocRef.update({
                isOnline: true,
                lastLogin: firestore.FieldValue.serverTimestamp(),
              });
              console.log('🟢 Firestore update() TAMAMLANDI');
            } catch (updateError) {
              console.error('🔴 Firestore update() HATA VERDİ:', updateError);
              throw updateError;
            }
          }

          console.log('🟡 Profile objesi oluşturuluyor...');
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
          };

          console.log('🟢 setAuthState ÇAĞRILIYOR (isAuthenticated: true, isLoading: false)');
          setAuthState({
            user: profile,
            isAuthenticated: true,
            isLoading: false,
            isNewUser: isNewData,
          });
        } catch (error) {
          console.error('🔴 Firestore profil yükleme hatası:', error);
          setAuthState({ user: null, isAuthenticated: false, isLoading: false, isNewUser: false });
        }
      } else {
        console.log('🟡 setAuthState ÇAĞRILIYOR (firebaseUser NULL)');
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

      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();

      const idToken = signInResult?.data?.idToken || (signInResult as any)?.idToken;

      if (!idToken) {
        throw new Error('Google idToken alınamadı. SHA-1 ve webClientId ayarlarını kontrol edin.');
      }

      const { accessToken } = await GoogleSignin.getTokens();

      console.log('--- GOOGLE LOGIN DEBUG ---');
      console.log('idToken:', idToken ? 'VAR' : 'YOK');
      console.log('accessToken:', accessToken ? 'VAR' : 'YOK');

      if (!accessToken) {
        throw new Error('Google accessToken alınamadı. GoogleSignin.configure ayarlarını (webClientId, scopes) kontrol edin.');
      }

      const realCredential = auth.GoogleAuthProvider.credential(idToken, accessToken);

      await firebaseAuth.signInWithCredential(realCredential);
      console.log('🟢 signInWithCredential TAMAMLANDI');
    } catch (error) {
      console.error('Google login detaylı hatası:', error);
      setAuthState((prev) => ({ ...prev, isLoading: false }));
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

  // 🎯 isNewUser'ı false yapıyoruz ki AppNavigator artık Home'a geçsin
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