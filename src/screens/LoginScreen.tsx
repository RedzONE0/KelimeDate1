import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { isAuthenticated, isLoading, isNewUser, loginWithGoogle, loginWithApple } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 45, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // 🎯 Akıllı yönlendirme (AppNavigator) devrede olduğu için el ile replace yapmıyoruz.
      console.log("Kelimedate kapısı açıldı, akıllı navigasyon yönlendiriyor...");
    }
  }, [isAuthenticated, isLoading]);

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      if (provider === 'google') {
        await loginWithGoogle();
      } else {
        await loginWithApple();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Giriş sırasında bir sorun oluştu.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = isSubmitting || isLoading;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#060816" />

        <View style={styles.hero}>
          <View style={styles.logoBubble}>
            <Text style={styles.logoText}>K</Text>
          </View>
          <Text style={styles.appName}>Kelimedate</Text>
          <Text style={styles.tagline}>Kelimelerle Tanış, Puanları Topla!</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hızlı giriş yap</Text>
          <Text style={styles.cardSubtitle}>Sadece bir dokunuşla oyuna başla.</Text>

          <Pressable style={styles.primaryButton} onPress={() => handleSocialLogin('google')} disabled={isBusy}>
            {isBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Google ile Giriş Yap</Text>}
          </Pressable>

          {Platform.OS === 'ios' ? (
            <Pressable style={styles.secondaryButton} onPress={() => handleSocialLogin('apple')} disabled={isBusy}>
              {isBusy ? <ActivityIndicator color="#f8fafc" /> : <Text style={styles.secondaryButtonText}>Apple ile Giriş Yap</Text>}
            </Pressable>
          ) : null}

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060816' },
  safeArea: { flex: 1, padding: 24, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: 24 },
  logoBubble: {
    width: 92,
    height: 92,
    borderRadius: 28,
    backgroundColor: '#8b5cf6', // Çökmeyi engellemek için düz mor renge çekildi
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  logoText: { color: '#fff', fontSize: 38, fontWeight: '800' },
  appName: { color: '#f8fafc', fontSize: 30, fontWeight: '800', marginBottom: 6 },
  tagline: { color: '#94a3b8', fontSize: 14, textAlign: 'center', lineHeight: 21 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cardTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  cardSubtitle: { color: '#94a3b8', fontSize: 13, marginBottom: 18, lineHeight: 20 },
  primaryButton: {
    backgroundColor: '#4285F4',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: '#111827',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  secondaryButtonText: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },
  errorText: { color: '#fda4af', fontSize: 12, marginTop: 14, textAlign: 'center' },
});
