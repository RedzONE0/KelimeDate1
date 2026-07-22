import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { collections } from '../services/firebaseConfig';

type MatchItem = { id: string; title: string; result: string; points: number; createdAt: any };

export default function MatchHistoryScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchItem[]>([]);
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
      return;
    }

    const col = collections.matches().where('players', 'array-contains', user.uid).orderBy('createdAt', 'desc').limit(50);
    const unsub = col.onSnapshot((snapshot: any) => {
      const items: MatchItem[] = snapshot.docs.map((d: any) => {
        const data = d.data() as any;
        return {
          id: d.id,
          title: data.gameMode ?? data.title ?? 'Maç',
          result: data.result ?? data.outcome ?? '—',
          points: Number(data.earnedPoints ?? data.points ?? 0),
          createdAt: data.createdAt ?? null,
        };
      });
      setMatches(items);
    });

    return () => unsub();
  }, [user]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#060816" />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable style={styles.backButton} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.backText}>← Ana Sayfa</Text>
          </Pressable>

          <Text style={styles.title}>Geçmiş Maçlar</Text>
          <Text style={styles.subtitle}>Son oyun performansın burada.</Text>

          {matches.map((mac) => (
            <View key={mac.id} style={styles.matchCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.matchTitle}>{mac.title}</Text>
                <Text style={styles.matchTime}>{mac.createdAt?.toDate ? mac.createdAt.toDate().toLocaleString() : mac.createdAt ?? ''}</Text>
              </View>
              <View style={styles.matchMeta}>
                <Text style={styles.matchResult}>{mac.result}</Text>
                <Text style={styles.matchScore}>{mac.points} Puan</Text>
              </View>
            </View>
          ))}
        </ScrollView>
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
  subtitle: { color: '#94a3b8', fontSize: 14, marginTop: 4, marginBottom: 14 },
  matchCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  matchTitle: { color: '#f8fafc', fontWeight: '700' },
  matchTime: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  matchMeta: { alignItems: 'flex-end' },
  matchResult: { color: '#86efac', fontWeight: '700' },
  matchScore: { color: '#cbd5e1', fontSize: 12, marginTop: 4 },
});