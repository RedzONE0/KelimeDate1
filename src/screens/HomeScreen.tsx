import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext'; // Verileri çekmek için eklendi

const hizliEylemler = [
  { baslik: 'Profil', altMetin: 'Kişisel istatistikler', ekran: 'Profile', ikon: '👤' },
  { baslik: 'Skor', altMetin: 'Lig sıralaması', ekran: 'Leaderboard', ikon: '🏆' },
  { baslik: 'Sohbet', altMetin: 'Topluluk odaları', ekran: 'Chat', ikon: '💬' },
  { baslik: 'Geçmiş', altMetin: 'Son maçlar', ekran: 'MatchHistory', ikon: '📜' },
];

const oyunKartlari = [
  { baslik: 'Kelime Tahmini', altMetin: 'Hızlı düşün ve doğru cevabı bul', ekran: 'GuessWord', ikon: '🧠' },
  { baslik: 'Kelime Zinciri', altMetin: 'Zinciri uzat ve puan kazan', ekran: 'WordChain', ikon: '🔗' },
  { baslik: 'Birlikte Bulalım', altMetin: 'Takım arkadaşıyla çöz', ekran: 'GuessTogether', ikon: '🤝' },
];

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth(); // Aktif giriş yapmış kullanıcının profil verileri
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 45, friction: 10, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 1400, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, [fadeAnim, slideAnim, floatAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#060816" />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>KELİME OYUNU & FLÖRT</Text>
              {/* Kullanıcının gerçek adıyla selamlıyoruz */}
              <Text style={styles.title}>Hoş geldin, {user?.displayName || 'Oyuncu'} 👋</Text>
              <Text style={styles.subtitle}>
                Kelimedate dünyasında kelimeleri türet, rakiplerinle yarış, hobilerini paylaş ve canlı sohbetin tadını çıkar!
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Canlı</Text>
            </View>
          </View>

          <Animated.View style={[styles.heroCard, { transform: [{ translateY: floatAnim }] }]}>
            <View style={styles.heroTop}>
              <Text style={styles.heroIcon}>🧠</Text>
              <View style={styles.heroTag}>
                <Text style={styles.heroTagText}>Haftanın modu</Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>Kelime Tahmini</Text>
            <Text style={styles.heroDesc}>Anlamı verilen kelimeyi harf harf tahmin et, puanları kap ve liderliğe oyna!</Text>
            <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('GuessWord')}>
              <Text style={styles.primaryButtonText}>Hemen Oyna</Text>
            </Pressable>
          </Animated.View>

          {/* 📊 Veri tabanından gelen gerçek istatistikler */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{user?.totalScore ?? 0}</Text>
              <Text style={styles.statLabel}>Toplam Puan</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{user?.gamesPlayed ?? 0}</Text>
              <Text style={styles.statLabel}>Maç Sayısı</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{user?.gamesWon ?? 0}</Text>
              <Text style={styles.statLabel}>Galibiyet</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
          </View>
          <View style={styles.grid}>
            {hizliEylemler.map((eylem) => (
              <Pressable key={eylem.baslik} style={styles.tile} onPress={() => navigation.navigate(eylem.ekran)}>
                <Text style={styles.tileIcon}>{eylem.ikon}</Text>
                <Text style={styles.tileTitle}>{eylem.baslik}</Text>
                <Text style={styles.tileSubtitle}>{eylem.altMetin}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Oyun Koleksiyonu</Text>
          </View>
          {oyunKartlari.map((oyun) => (
            <Pressable key={oyun.baslik} style={styles.gameCard} onPress={() => navigation.navigate(oyun.ekran)}>
              <Text style={styles.gameIcon}>{oyun.ikon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.gameTitle}>{oyun.baslik}</Text>
                <Text style={styles.gameSubtitle}>{oyun.altMetin}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060816' },
  safeArea: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 8, marginBottom: 20 },
  eyebrow: { color: '#8b5cf6', fontSize: 12, fontWeight: '700', letterSpacing: 1.4, marginBottom: 8 },
  title: { color: '#f8fafc', fontSize: 24, fontWeight: '800', lineHeight: 30, marginBottom: 8 },
  subtitle: { color: '#94a3b8', fontSize: 14, lineHeight: 22, maxWidth: 320 },
  badge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(34, 197, 94, 0.15)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.3)' },
  badgeText: { color: '#86efac', fontSize: 12, fontWeight: '700' },
  heroCard: { borderRadius: 24, padding: 20, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  heroIcon: { fontSize: 30 },
  heroTag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(34, 211, 238, 0.16)' },
  heroTagText: { color: '#67e8f9', fontSize: 12, fontWeight: '700' },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  heroDesc: { color: '#cbd5e1', fontSize: 14, lineHeight: 21, marginBottom: 14 },
  primaryButton: { alignSelf: 'flex-start', backgroundColor: '#8b5cf6', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 999 },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { flex: 1, marginHorizontal: 4, padding: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '800' },
  statLabel: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  sectionHeader: { marginBottom: 10, marginTop: 4 },
  sectionTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  tile: { width: '48%', padding: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginBottom: 10 },
  tileIcon: { fontSize: 22, marginBottom: 8 },
  tileTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  tileSubtitle: { color: '#94a3b8', fontSize: 12, lineHeight: 18 },
  gameCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginBottom: 12 },
  gameIcon: { fontSize: 24, marginRight: 14 },
  gameTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  gameSubtitle: { color: '#94a3b8', fontSize: 13 }
});
