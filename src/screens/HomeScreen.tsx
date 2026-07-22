import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, ScrollView, StatusBar, StyleSheet, Text, View, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig'; // Gerçek veri tabanı bağlantısı

const { width } = Dimensions.get('window');

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
  const { user, signOut } = useAuth();

  // 🎯 GERÇEK VERİ STATE'LERİ
  const [leaderboard, setLeaderboard] = useState<any[]>([]); // Gerçek en yüksek puanlı 3 oyuncu
  const [currentStreak, setCurrentStreak] = useState<number>((user as any)?.streakCount ?? 1);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  const scaleMapRef = useRef<Record<string, Animated.Value>>({});

  [...hizliEylemler, ...oyunKartlari, { baslik: 'HaftaninModu' }].forEach((item) => {
    if (!scaleMapRef.current[item.baslik]) {
      scaleMapRef.current[item.baslik] = new Animated.Value(1);
    }
  });

  // 🎯 FİREBASE'DEN GERÇEK LİDERLİK VERİLERİNİ ÇEKEN MOTOR
  useEffect(() => {
    const fetchTopPlayers = async () => {
      try {
        // Firestore'dan toplam puanı en yüksek olan İLK 3 gerçek oyuncuyu getirir
        const snapshot = await db.collection('users')
          .orderBy('totalScore', 'desc')
          .limit(3)
          .get();

        const ranks = ['🥇', '🥈', '🥉'];
        const topPlayers = snapshot.docs.map((doc, index) => ({
          id: doc.id,
          name: doc.data().displayName || 'Bilinmeyen Siber',
          score: (doc.data().totalScore ?? 0).toLocaleString() + ' Puan',
          rank: ranks[index] || '🎖️'
        }));

        setLeaderboard(topPlayers);
      } catch (error) {
        console.error("Liderlik tablosu çekilirken gerçek hata:", error);
      }
    };

    fetchTopPlayers();
  }, []);

  const handleSignOut = () => {
    Alert.alert('Çıkış yap', 'Hesabından çıkmak istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: signOut },
    ]);
  };

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

  const onPressInCard = (id: string) => {
    if (scaleMapRef.current[id]) {
      Animated.spring(scaleMapRef.current[id], { toValue: 0.95, tension: 150, friction: 7, useNativeDriver: true }).start();
    }
  };

  const onPressOutCard = (id: string) => {
    if (scaleMapRef.current[id]) {
      Animated.spring(scaleMapRef.current[id], { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }).start();
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#060816" />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Üst Karşılama Alanı */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>KELİME OYUNU & FLÖRT</Text>
              <Text style={styles.title}>Hoş geldin, {user?.displayName || 'Oyuncu'} 👋</Text>
              <Text style={styles.subtitle}>
                Kelimedate dünyasında kelimeleri türet, rakiplerinle yarış, hobilerini paylaş ve canlı sohbetin tadını çıkar!
              </Text>
            </View>
            <View style={styles.headerActions}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Canlı</Text>
              </View>
              <Pressable style={styles.logoutButton} onPress={handleSignOut}>
                <Text style={styles.logoutButtonText}>Çıkış</Text>
              </Pressable>
            </View>
          </View>

          {/* 🔋 1. GRAFİK BOMBASI: Cyber Streak (Gerçek Günlük Giriş Sayacı) */}
          <View style={styles.streakSection}>
            <View style={styles.streakInfoRow}>
              <Text style={styles.streakTitle}>🔥 SİBER SERİ (STREAK)</Text>
              <Text style={styles.streakValue}>{currentStreak} GÜN</Text>
            </View>
            {/* Gerçek sayaç değerine göre dolan dinamik batarya çubukları */}
            <View style={styles.batteryContainer}>
              <View style={[styles.batterySegment, { backgroundColor: currentStreak >= 1 ? '#67e8f9' : 'rgba(255,255,255,0.04)' }]} />
              <View style={[styles.batterySegment, { backgroundColor: currentStreak >= 2 ? '#67e8f9' : 'rgba(255,255,255,0.04)' }]} />
              <View style={[styles.batterySegment, { backgroundColor: currentStreak >= 3 ? '#8b5cf6' : 'rgba(255,255,255,0.04)' }]} />
              <View style={[styles.batterySegment, { backgroundColor: currentStreak >= 4 ? '#8b5cf6' : 'rgba(255,255,255,0.04)' }]} />
              <View style={[styles.batterySegment, { backgroundColor: currentStreak >= 5 ? '#f59e0b' : 'rgba(255,255,255,0.04)' }]} />
            </View>
          </View>

          {/* Haftanın Modu Ana Kartı (3D Yaylanmalı) */}
          <Animated.View style={{ transform: [{ translateY: floatAnim }, { scale: scaleMapRef.current['HaftaninModu'] || 1 }] }}>
            <Pressable 
              style={styles.heroCard} 
              onPressIn={() => onPressInCard('HaftaninModu')}
              onPressOut={() => onPressOutCard('HaftaninModu')}
              onPress={() => navigation.navigate('GuessWord')}
            >
              <View style={styles.heroTop}>
                <Text style={styles.heroIcon}>🧠</Text>
                <View style={styles.heroTag}>
                  <Text style={styles.heroTagText}>Haftanın modu</Text>
                </View>
              </View>
              <Text style={styles.heroTitle}>Kelime Tahmini</Text>
              <Text style={styles.heroDesc}>Anlamı verilen kelimeyi harf harf tahmin et, puanları kap ve liderliğe oyna!</Text>
              <View style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Hemen Oyna</Text>
              </View>
            </Pressable>
          </Animated.View>

          {/* Veri Tabanından Gelen Gerçek İstatistikler Satırı */}
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

          {/* Hızlı Erişim Menüsü (3D Yaylanmalı Karolar) */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
          </View>
          <View style={styles.grid}>
            {hizliEylemler.map((eylem) => (
              <Animated.View key={eylem.baslik} style={{ width: '48%', transform: [{ scale: scaleMapRef.current[eylem.baslik] || 1 }] }}>
                <Pressable 
                  style={styles.tile}
                  onPressIn={() => onPressInCard(eylem.baslik)}
                  onPressOut={() => onPressOutCard(eylem.baslik)}
                  onPress={() => navigation.navigate(eylem.ekran)}
                >
                  <Text style={styles.tileIcon}>{eylem.ikon}</Text>
                  <Text style={styles.tileTitle}>{eylem.baslik}</Text>
                  <Text style={styles.tileSubtitle}>{eylem.altMetin}</Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>

          {/* 🏆 2. GRAFİK BOMBASI: Hologram Podyumu (Gerçek Liderlik Tablosu) */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Hologram Podyumu</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hologramScroll}>
            {leaderboard.length > 0 ? (
              leaderboard.map((sampiyon) => (
                <View key={sampiyon.id} style={styles.hologramCard}>
                  <Text style={styles.hologramRank}>{sampiyon.rank}</Text>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.hologramName} numberOfLines={1}>{sampiyon.name}</Text>
                    <Text style={styles.hologramScore}>{sampiyon.score}</Text>
                  </View>
                </View>
              ))
            ) : (
              // Veriler çekilirken gösterilecek şık siberpunk yükleniyor taslağı
              <View style={[styles.hologramCard, { width: width * 0.9, justifyContent: 'center' }]}>
                <ActivityIndicator size="small" color="#67e8f9" />
                <Text style={[styles.hologramScore, { marginLeft: 10 }]}>Siber veriler taranıyor...</Text>
              </View>
            )}
          </ScrollView>

          {/* Oyun Koleksiyonu (3D Yaylanmalı Kartlar) */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Oyun Koleksiyonu</Text>
          </View>
          {oyunKartlari.map((oyun) => (
            <Animated.View key={oyun.baslik} style={{ transform: [{ scale: scaleMapRef.current[oyun.baslik] || 1 }] }}>
              <Pressable 
                style={styles.gameCard}
                onPressIn={() => onPressInCard(oyun.baslik)}
                onPressOut={() => onPressOutCard(oyun.baslik)}
                onPress={() => navigation.navigate(oyun.ekran)}
              >
                <Text style={styles.gameIcon}>{oyun.ikon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gameTitle}>{oyun.baslik}</Text>
                  <Text style={styles.gameSubtitle}>{oyun.altMetin}</Text>
                </View>
              </Pressable>
            </Animated.View>
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
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  badge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(34, 197, 94, 0.15)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.3)' },
  badgeText: { color: '#86efac', fontSize: 12, fontWeight: '700' },
  logoutButton: { marginLeft: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(248,113,113,0.12)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)' },
  logoutButtonText: { color: '#fca5a5', fontSize: 12, fontWeight: '700' },
  heroCard: { borderRadius: 24, padding: 20, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  heroIcon: { fontSize: 30 },
  heroTag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(34, 211, 238, 0.16)' },
  heroTagText: { color: '#67e8f9', fontSize: 12, fontWeight: '700' },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  heroDesc: { color: '#cbd5e1', fontSize: 14, lineHeight: 21, marginBottom: 14 },
  primaryButton: { alignSelf: 'flex-start', backgroundColor: '#8b5cf6', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 999 },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  
  // 🔋 Cyber Streak Canlı Enerji Bataryası Stilleri
  streakSection: { backgroundColor: 'rgba(139, 92, 246, 0.04)', borderRadius: 18, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.15)' },
  streakInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  streakTitle: { color: '#67e8f9', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  streakValue: { color: '#fff', fontSize: 14, fontWeight: '900' },
  batteryContainer: { flexDirection: 'row', gap: 6, height: 10, width: '100%' },
  batterySegment: { flex: 1, borderRadius: 4 },

  // İstatistik Kartları
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { flex: 1, marginHorizontal: 4, padding: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '800' },
  statLabel: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  sectionHeader: { marginBottom: 10, marginTop: 4 },
  sectionTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  
  // Hızlı Erişim Karo Izgarası
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  tile: { width: '100%', padding: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginBottom: 10 },
  tileIcon: { fontSize: 22, marginBottom: 8 },
  tileTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  tileSubtitle: { color: '#94a3b8', fontSize: 12, lineHeight: 18 },

  // 🏆 Liderlik Hologram Podyumu Stilleri
  hologramScroll: { paddingVertical: 4, paddingRight: 20, marginBottom: 16 },
  hologramCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(6, 182, 212, 0.04)', borderWidth: 1, borderColor: 'rgba(6, 182, 212, 0.15)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginRight: 12, width: width * 0.46 },
  hologramRank: { fontSize: 22 },
  hologramName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  hologramScore: { color: '#67e8f9', fontSize: 12, fontWeight: '600', marginTop: 2 },

  // Oyun Koleksiyonu Kart Listesi
  gameCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginBottom: 12 },
  gameIcon: { fontSize: 24, marginRight: 14 },
  gameTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  gameSubtitle: { color: '#94a3b8', fontSize: 13 }
});