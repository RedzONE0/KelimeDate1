import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StatusBar, StyleSheet, Text, View, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collections } from '../services/firebaseConfig';
import { getAvatarById } from '../constants/avatars'; // Avatarları çekmek için eklendi
import { User } from '../types';

export default function LeaderboardScreen() {
  const navigation = useNavigation<any>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  
  const [players, setPlayers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 45, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    // 🎯 DÜZELTME: Verileri 'leaderboard' yerine gerçek kullanıcıların olduğu 'users' koleksiyonundan çekiyoruz
    const col = collections.users().orderBy('totalScore', 'desc').limit(20);
    
    const unsub = col.onSnapshot((snapshot: any) => {
      const items: User[] = snapshot.docs.map((d: any) => {
        return { uid: d.id, ...d.data() } as User;
      });
      setPlayers(items);
      setLoading(false);
    }, (error) => {
      console.error("Skor tablosu çekilemedi:", error);
      setLoading(false);
    });
    
    return () => unsub();
  }, []);

  // Küçük yardımcı bileşen: Oyuncunun fütüristik görselini ve online noktasını basar
  const renderPlayerAvatar = (avatarId: string, isOnline: boolean, size = 44) => {
    const avatarInfo = getAvatarById(avatarId || 'avatar-1');
    return (
      <View style={{ width: size, height: size, marginRight: 12 }}>
        <Image 
          source={avatarInfo?.imageSource || require('../../assets/icon.png')} 
          style={[styles.avatarImg, { borderRadius: size / 2 }]} 
        />
        {isOnline && <View style={styles.onlineDot} />}
      </View>
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#060816" />
        
        {loading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Pressable style={styles.backButton} onPress={() => navigation.navigate('Home')}>
              <Text style={styles.backText}>← Ana Sayfa</Text>
            </Pressable>

            <Text style={styles.title}>Liderlik Tablosu</Text>
            <Text style={styles.subtitle}>Kelimedate'in en yüksek puanlı oyuncuları</Text>

            {/* 🏆 PODYUM ALANI (İLK 3 OYUNCU) */}
            <View style={styles.podiumCard}>
              {/* 🥇 1. OLAN OYUNCU */}
              <View style={styles.firstPlace}>
                <Text style={styles.podiumBadge}>🥇 1</Text>
                {renderPlayerAvatar(players[0]?.avatarId, players[0]?.isOnline, 60)}
                <Text style={styles.podiumName} numberOfLines={1}>{players[0]?.displayName ?? '—'}</Text>
                <Text style={styles.podiumScore}>{(players[0]?.totalScore ?? 0).toLocaleString()} Puan</Text>
              </View>
              
              <View style={styles.row}>
                {/* 🥈 2. OLAN OYUNCU */}
                <View style={styles.secondPlace}>
                  <Text style={styles.podiumBadge_sub}>🥈 2</Text>
                  {renderPlayerAvatar(players[1]?.avatarId, players[1]?.isOnline, 50)}
                  <Text style={styles.podiumName} numberOfLines={1}>{players[1]?.displayName ?? '—'}</Text>
                  <Text style={styles.podiumScore}>{(players[1]?.totalScore ?? 0).toLocaleString()} Puan</Text>
                </View>
                
                {/* 🥉 3. OLAN OYUNCU */}
                <View style={styles.thirdPlace}>
                  <Text style={styles.podiumBadge_sub}>🥉 3</Text>
                  {renderPlayerAvatar(players[2]?.avatarId, players[2]?.isOnline, 50)}
                  <Text style={styles.podiumName} numberOfLines={1}>{players[2]?.displayName ?? '—'}</Text>
                  <Text style={styles.podiumScore}>{(players[2]?.totalScore ?? 0).toLocaleString()} Puan</Text>
                </View>
              </View>
            </View>

            {/* 📜 LİSTE ALANI (4. SIRADAN SONRASI) */}
            {players.slice(3).map((p, index) => (
              <View key={p.uid} style={styles.playerRow}>
                <Text style={styles.rank}>#{index + 4}</Text>
                {renderPlayerAvatar(p.avatarId, p.isOnline, 42)}
                <Text style={styles.playerName} numberOfLines={1}>{p.displayName}</Text>
                <Text style={styles.playerScore}>{p.totalScore.toLocaleString()} Puan</Text>
              </View>
            ))}
            
            {players.length === 0 && (
              <Text style={styles.emptyText}>Henüz skor kaydı bulunamadı.</Text>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060816' },
  safeArea: { flex: 1 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  backButton: { marginBottom: 12, alignSelf: 'flex-start' },
  backText: { color: '#8b5cf6', fontSize: 14, fontWeight: '700' },
  title: { color: '#fff', fontSize: 26, fontWeight: '800' },
  subtitle: { color: '#94a3b8', fontSize: 14, marginTop: 4, marginBottom: 18 },
  podiumCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 16 },
  firstPlace: { alignItems: 'center', paddingVertical: 16, backgroundColor: 'rgba(245, 158, 11, 0.12)', borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.25)' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  secondPlace: { flex: 1, marginRight: 6, alignItems: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: 'rgba(148, 163, 184, 0.08)', borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.15)' },
  thirdPlace: { flex: 1, marginLeft: 6, alignItems: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: 'rgba(191, 219, 254, 0.06)', borderWidth: 1, borderColor: 'rgba(191, 219, 254, 0.12)' },
  podiumBadge: { color: '#fbbf24', fontSize: 14, fontWeight: '800', marginBottom: 8 },
  podiumBadge_sub: { color: '#94a3b8', fontSize: 12, fontWeight: '800', marginBottom: 8 },
  podiumName: { color: '#f8fafc', fontSize: 14, fontWeight: '700', marginTop: 6, maxWidth: 100 },
  podiumScore: { color: '#a78bfa', fontSize: 13, fontWeight: '600', marginTop: 2 },
  playerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  rank: { color: '#8b5cf6', fontWeight: '800', width: 35, fontSize: 14 },
  avatarImg: { width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.05)' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#060816' },
  playerName: { flex: 1, color: '#f8fafc', fontWeight: '700', fontSize: 15 },
  playerScore: { color: '#cbd5e1', fontWeight: '700', fontSize: 14 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 14 },
});
