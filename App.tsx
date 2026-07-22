import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native'; // Köprüyü ekledik
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import LoginScreen from './src/screens/LoginScreen';

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  // LoginScreen artık bir NavigationContainer içinde olduğu için
  // içindeki useNavigation() kancası hata vermeden çalışacaktır.
  return <LoginScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer> 
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#060816',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
