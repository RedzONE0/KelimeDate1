import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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

// Girdi temizleme (Güvenlik) fonksiyonları
const sanitizeText = (value: string, maxLength = 80): string => 
  value.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);

const sanitizeStringArray = (values: string[]): string[] => 
  Array.from(new Set(values.map((value) => sanitizeText(value, 40)).filter(Boolean)));

GoogleSignin.configure({
  webClientId: '681199810177-9pecsef70hbqpb2rafr9nhd8bh32gf1c.apps.googleusercontent.com' // Burası Firebase konsolundan alınacak
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);

  // Firebase kullanıcısını Kelimedate veri yapısına dönüştüren fonksiyon
  const mapFirebaseUserToAppUser = async (firebaseUser: any): Promise<{ profile: User; isNewUser: boolean }> => {
    const userDocRef = db.collection('users').doc(firebaseUser.uid);
    const userSnapshot = await userDocRef.get();
    
    const firestoreData = userSnapshot.exists() ? userSnapshot.data() : {};
    const isNewUser = !userSnapshot.exists();

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
      blockedUsers: firestoreData?.blockedUsers ?? []
    };

    // Kullanıcı ilk defa geliyorsa veya profilini güncelliyorsa her girişte son giriş zamanını sunucu saatiyle kaydediyoruz
    await userDocRef.set({
      ...profile,
      lastLogin: firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return { profile, isNewUser };
  };

  // Oturum durumunu dinleyen mekanizma
  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (firebaseUser: any) => {
      if (firebaseUser) {
        try {
          const { profile, isNewUser } = await mapFirebaseUserToAppUser(firebaseUser);
          setAuthState({ user: profile, isAuthenticated: true, isLoading: false, isNewUser });
        } catch (error) {
          console.error('Oturum yüklenirken hata:', error);
          setAuthState({ user: null, isAuthenticated: false, isLoading: false, isNewUser: false });
        }
      } else {
        setAuthState({ user: null, isAuthenticated: false, isLoading: false, isNewUser: false });
      }
    });

    return unsubscribe;
  }, []);

       // Google ile Giriş Fonksiyonu (Garantili Sürüm)
  const loginWithGoogle = async (): Promise<void> => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));
    try {
      if (Platform.OS === 'web') {
        throw new Error('Google girişi bu platformda desteklenmiyor.');
      }
      
      // 1. Play Servislerini Kontrol Et
      await GoogleSignin.hasPlayServices();
      
      // 2. Giriş İsteyip Gelen Veriyi Al
      const signInResult = await GoogleSignin.signIn();
      
      // 🎯 KRİTİK GÜNCELLEME: Yeni sürümlerde idToken 'data' objesinin içindedir.
      // Her ihtimale karşı hem eski hem yeni sürüm yollarını güvene alıyoruz:
      const idToken = signInResult?.data?.idToken || (signInResult as any)?.idToken;

      if (!idToken) {
        throw new Error('Google identity token (idToken) alınamadı. Lütfen SHA-1 ayarlarınızı kontrol edin.');
      }

      // 🎯 Firebase kimlik kartını sadece idToken ile oluşturuyoruz (accessToken boş kalabilir, hata vermez)
      const credential = auth.GoogleAuthProvider.credential(idToken);
      
      // 3. Firebase Oturumunu Başlat
      await firebaseAuth.signInWithCredential(credential);
    } catch (error) {
      console.error('Google login detaylı hatası:', error);
      throw error;
    } finally {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Apple ile Giriş Fonksiyonu
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
      throw error;
    } finally {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Çıkış Yapma Fonksiyonu
  const signOut = async (): Promise<void> => {
    try {
      if (authState.user) {
        // Çıkış yaparken kullanıcının online durumunu kapatıyoruz
        await db.collection('users').doc(authState.user.uid).update({
          isOnline: false
        });
      }
      await firebaseAuth.signOut();
    } catch (error) {
      console.error('Çıkış yaparken hata:', error);
    }
  };

  // Profil Verilerini Güncelleme Fonksiyonu (Boy, Kilo, Cinsiyet, Hobi vb.)
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
