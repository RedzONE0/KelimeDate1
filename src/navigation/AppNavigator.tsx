import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

// Ekranlarımızı import ediyoruz
import LoginScreen from '../screens/LoginScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen'; // Eksikti, eklendi!
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import ChatScreen from '../screens/ChatScreen';
import MatchHistoryScreen from '../screens/MatchHistoryScreen';
import GuessWordScreen from '../screens/games/GuessWordScreen';
import WordChainScreen from '../screens/games/WordChainScreen';
import GuessTogetherScreen from '../screens/games/GuessTogetherScreen';

// Ekran parametre tipleri
export type RootStackParamList = {
  Login: undefined;
  ProfileSetup: undefined; // Yeni kullanıcılar için eklendi
  Home: undefined;
  Profile: undefined;
  Leaderboard: undefined;
  Chat: undefined;
  MatchHistory: undefined;
  GuessWord: undefined;
  WordChain: undefined;
  GuessTogether: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated, isNewUser } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* 🔐 DURUM 1: Kullanıcı giriş yapmadıysa SADECE Login ekranını görebilir */}
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : isNewUser ? (
        /* 🧑‍💻 DURUM 2: Kullanıcı giriş yaptı ama İLK KEZ giriyorsa Profil Kurulumuna gider */
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      ) : (
        /* 🎮 DURUM 3: Giriş yapmış eski kullanıcılar tüm oyun dünyasına erişebilir */
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="MatchHistory" component={MatchHistoryScreen} />
          <Stack.Screen name="GuessWord" component={GuessWordScreen} />
          <Stack.Screen name="WordChain" component={WordChainScreen} />
          <Stack.Screen name="GuessTogether" component={GuessTogetherScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
