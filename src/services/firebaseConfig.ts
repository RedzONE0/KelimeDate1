// src/services/firebaseConfig.ts
import authModule from '@react-native-firebase/auth';
import firestoreModule from '@react-native-firebase/firestore';
 
// React Native Firebase yerel servislerini doğrudan başlatıyoruz
export const firebaseAuth = authModule();
export const db = firestoreModule();
 
// Backwards-compatible aliases used across the codebase
export const auth = firebaseAuth;
export const firestore = db;
 
// Proje genelinde kullanacağımız güvenli koleksiyon referansları
export const collections = {
  users: () => db.collection('users'),
  matches: () => db.collection('matches'),
  leaderboard: () => db.collection('leaderboard'),
};