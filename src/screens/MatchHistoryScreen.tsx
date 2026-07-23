import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Pressable, StatusBar, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { collections } from '../services/firebaseConfig';
 
type MatchItem = { id: string; title: string; result: string; points: number; createdAt: any };
 
export default function MatchHistoryScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [screenLoading, setScreenLoading] = useState(true); // Siber veriler yüklenirken spinner göstermek için
 
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
 
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 45, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);
 
  useEffect(() => {
    if (!user) {
      setMatches([]);
      setScreenLoading(false);
      return;
    }
 
    const col = collections.matches().where('participants', 'array-contains', user.uid).orderBy('createdAt', 'desc').limit(50);
    
    const unsub = col.onSnapshot((snapshot: any) => {
      // 🎯 KESİN ÇÖZÜM: docs property'sinin null veya undefined olma durumunu engelliyoruz!
      if (!snapshot || !snapshot.docs) {
        setMatches([]);
        setScreenLoading(false);
        return;
      }
 
      const items: MatchItem[] = snapshot.docs.map((d: any) => {
        const data = d.data() as any;
        return {
          id: d.id,
          title: data.gameMode ?? data.title ?? 'Siber Düello',
          result: data.result ?? data.outcome ?? '—',
          points: Number(data.earnedPoints ?? data.points ?? 0),
          createdAt: data.createdAt ?? null,
        };
      });
      
      setMatches(items);
      setScreenLoading(false);
    }, (error) => {
      console.error("Geçmiş maçlar snapshot hatası:", error);
      setScreenLoading(false);
    });
 
    return () => unsub();
  }, [user?.uid]);
 
  const renderMatch = ({ item: mac }: { item: MatchItem }) => {
    // Maç sonucuna göre dinamik neon renk tespiti
    const isWin = ['kazandın', 'galibiyet', 'win', 'kazandi'].includes(mac.result.toLowerCase().trim());
    return (
      <View style={styles.matchCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.matchTitle}>{mac.title}</Text>
          <Text style={styles.matchTime}>
            {mac.createdAt?.toDate ? mac.createdAt.toDate().toLocaleString() : mac.createdAt ?? 'Bilinmeyen Zaman'}
          </Text>
        </View>
        <View style={styles.matchMeta}>
          <Text style={[styles.matchResult, { color: isWin ? '#4ade80' : '#f87171' }]}>{mac.result}</Text>
          <Text style={[styles.matchScore, { color: isWin ? '#67e8f9' : '#94a3b8' }]}>
            {isWin ? `+${mac.points}` : mac.points} Puan
          </Text>
        </View>
      </View>
    );
  };
return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#060816" />
        <FlatList
          data={screenLoading ? [] : matches}
          keyExtractor={(item) => item.id}
          renderItem={renderMatch}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={(
            <View>
              {/* Üst Geri Dönüş Köprüsü */}
              <Pressable style={styles.backButton} onPress={() => navigation.navigate('Home')}>
                <Text style={styles.backText}>← Ana Sayfa</Text>
              </Pressable>
              <Text style={styles.title}>Geçmiş Maçlar</Text>
              <Text style={styles.subtitle}>Son oyun performansın ve siber skorların burada.</Text>
            </View>
          )}
          ListEmptyComponent={screenLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#8b5cf6" />
              <Text style={styles.loadingText}>Siber geçmiş taranıyor...</Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>⚔</Text>
              <Text style={styles.emptyTitle}>Siber Geçmiş Temiz</Text>
              <Text style={styles.emptyDesc}>
                Henüz hiçbir siber düelloya katılmadın kanka! Hemen lobiye dön, Kelime Tahmini veya Kelime Zinciri modunda rakiplerine meydan oku.
              </Text>
              <Pressable style={styles.emptyButton} onPress={() => navigation.navigate('Home')}>
                <Text style={styles.emptyButtonText}>Lobiye Dön ve Savaş</Text>
              </Pressable>
            </View>
          )}
        />
      </SafeAreaView>
    </Animated.View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060816' },
  safeArea: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  backButton: { marginBottom: 12, alignSelf: 'flex-start' },
  backText: { color: '#67e8f9', fontSize: 14, fontWeight: '700' },
  title: { color: '#fff', fontSize: 26, fontWeight: '800' },
  subtitle: { color: '#94a3b8', fontSize: 14, marginTop: 4, marginBottom: 20 },
  
  // Maç Kart Yerleşimleri
  matchCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  matchTitle: { color: '#f8fafc', fontWeight: '700', fontSize: 15 },
  matchTime: { color: '#64748b', fontSize: 12, marginTop: 4, fontWeight: '600' },
  matchMeta: { alignItems: 'flex-end', justifyContent: 'center' },
  matchResult: { fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  matchScore: { fontSize: 12, marginTop: 4, fontWeight: '700' },
 
  // Yüklenme ve Orta Kutu Tasarımları
  centerBox: { marginTop: 60, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#8b5cf6', fontSize: 13, marginTop: 12, fontWeight: '700', letterSpacing: 1 },
 
  // Fütüristik Boş Durum (Empty State) Stilleri
  emptyCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 24, alignItems: 'center', marginTop: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  emptyIcon: { fontSize: 40, marginBottom: 12, color: '#8b5cf6' },
  emptyTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptyDesc: { color: '#94a3b8', fontSize: 13, textAlign: 'center', lineHeight: 20, paddingHorizontal: 10, marginBottom: 20 },
  emptyButton: { backgroundColor: '#8b5cf6', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: '#67e8f9' },
  emptyButtonText: { color: '#07131f', fontSize: 14, fontWeight: '800' }
});
  