import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StatusBar, StyleSheet, Text, View, Image, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collections, db } from '../services/firebaseConfig';
import { getAvatarById } from '../constants/avatars'; 
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';

const { width } = Dimensions.get('window');

export default function LeaderboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth(); // Aktif giren kullanıcıyı yakalıyoruz

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  
  const [players, setPlayers] = useState<User[]>([]); // İlk 100 oyuncu listesi
  const [myExactRank, setMyExactRank] = useState<number>(0); // Kullanıcının dünyadaki tam sırası (örn: 502)
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 45, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    // 🎯 1. ADIM: En yüksek puanlı ilk 100 gerçek kullanıcıyı canlı dinliyoruz
    const col = collections.users().orderBy('totalScore', 'desc').limit(100);
    
    const unsub = col.onSnapshot(async (snapshot: any) => {
      if (!snapshot || !snapshot.docs) {
        setLoading(false);
        return;
      }

      const items: User[] = snapshot.docs.map((d: any) => {
        return { uid: d.id, ...d.data() } as User;
      });
      setPlayers(items);

      // 🎯 2. ADIM: 502. Sıra Sihri! Puanı aktif kullanıcıdan yüksek olan kaç kişi var saydırıyoruz
      if (user?.totalScore != null) {
        try {
          const countSnapshot = await db.collection('users')
            .where('totalScore', '>', user.totalScore)
            .get();

          // Üstteki kişi sayısı + 1 = Kullanıcının dünyadaki net lig sırası!
          setMyExactRank(countSnapshot.docs.length + 1);
        } catch (e) {
          console.error("Sıralama hesabı hatası:", e);
        }
      }
      
      setLoading(false);
    }, (error) => {
      console.error("Skor tablosu çekilemedi:", error);
      setLoading(false);
    });
    
    return () => unsub();
  }, [user]);

  // 👤 Senin harika avatar ve online noktası basan bileşenin (Aynen korundu)
  const renderPlayerAvatar = (avatarId: string, isOnline: boolean, size = 44) => {
    const avatarInfo = getAvatarById(avatarId || 'avatar-1');
    return (
      <View style={{ width: size, height: size, marginRight: 12, position: 'relative' }}>
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
          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <Pressable style={styles.backButton} onPress={() => navigation.navigate('Home')}>
                <Text style={styles.backText}>← Ana Sayfa</Text>
              </Pressable>

              <Text style={styles.title}>Liderlik Tablosu</Text>
              <Text style={styles.subtitle}>Kelimedate'in en yüksek puanlı oyuncuları</Text>

              {/* 🏆 PODYUM ALANI (İLK 3 OYUNCU) */}
              <View style={styles.podiumCard}>
                {/* 🥇 1. OLAN ŞAMPİYON OYUNCU (Şatafat Artırıldı) */}
                <View style={[styles.firstPlace, user?.uid === players[0]?.uid && styles.myHighlightedCard]}>
                  <Text style={styles.podiumBadge}>🥇 1</Text>
                  {renderPlayerAvatar(players[0]?.avatarId, players[0]?.isOnline, 64)}
                  <Text style={styles.podiumName} numberOfLines={1}>{players[0]?.displayName ?? '—'}</Text>
                  <Text style={styles.podiumScore}>{(players[0]?.totalScore ?? 0).toLocaleString()} Puan</Text>
                </View>
                
                <View style={styles.row}>
                  {/* 🥈 2. OLAN OYUNCU */}
                  <View style={[styles.secondPlace, user?.uid === players[1]?.uid && styles.myHighlightedCard_sub]}>
                    <Text style={styles.podiumBadge_sub}>🥈 2</Text>
                    {renderPlayerAvatar(players[1]?.avatarId, players[1]?.isOnline, 50)}
                    <Text style={styles.podiumName} numberOfLines={1}>{players[1]?.displayName ?? '—'}</Text>
                    <Text style={styles.podiumScore}>{(players[1]?.totalScore ?? 0).toLocaleString()} Puan</Text>
                  </View>
                  
                  {/* 🥉 3. OLAN OYUNCU */}
                  <View style={[styles.thirdPlace, user?.uid === players[2]?.uid && styles.myHighlightedCard_sub]}>
                    <Text style={styles.podiumBadge_sub}>🥉 3</Text>
                    {renderPlayerAvatar(players[2]?.avatarId, players[2]?.isOnline, 50)}
                    <Text style={styles.podiumName} numberOfLines={1}>{players[2]?.displayName ?? '—'}</Text>
                    <Text style={styles.podiumScore}>{(players[2]?.totalScore ?? 0).toLocaleString()} Puan</Text>
                  </View>
                </View>
              </View>

              {/* 📜 LİSTE ALANI (4. SIRADAN 100. SIRAYA KADAR) */}
              {players.slice(3).map((p, index) => {
                const currentRank = index + 4;
                const isMe = user?.uid === p.uid; // Listedeki satır bana mı ait kontrolü kanka
                const isTop10 = currentRank <= 10; // İlk 10 şatafatı için

                return (
                  <View 
                    key={p.uid} 
                    style={[
                      styles.playerRow, 
                      isMe && styles.myRowAnchor, // 🎯 Kendini şak diye bulman için Neon Cyan çizgisi!
                      isTop10 && !isMe && styles.top10Border // İlk 10'a özel siber hat çizgisi
                    ]}
                  >
                    <Text style={[styles.rank, isMe && { color: '#67e8f9' }, isTop10 && !isMe && { color: '#fbbf24' }]}>
                      #{currentRank}
                    </Text>
                    {renderPlayerAvatar(p.avatarId, p.isOnline, 42)}
                    <Text style={[styles.playerName, isMe && { color: '#67e8f9' }]} numberOfLines={1}>
                      {p.displayName} {isMe ? ' (Sen)' : ''}
                    </Text>
                    <Text style={[styles.playerScore, isMe && { color: '#67e8f9' }]}>
                      {p.totalScore.toLocaleString()} Puan
                    </Text>
                  </View>
                );
              })}
              
              {players.length === 0 && (
                <Text style={styles.emptyText}>Henüz skor kaydı bulunamadı.</Text>
              )}
            </ScrollView>

            {/* 🎯 4. BÜYÜK VİZYON ADIMI: STICKY FOOTER (Kullanıcı 100'ün Gerisindeyse En Altta Yapışık Duran Panel) */}
            {myExactRank > 100 && (
              <View style={styles.stickyRankFooter}>
                <Text style={styles.stickyRankText}>#{myExactRank}</Text>
                {renderPlayerAvatar(user?.avatarId ?? 'avatar-1', true, 40)}
                <Text style={styles.stickyNameText} numberOfLines={1}>{user?.displayName || 'Oyuncu'} (Sen)</Text>
                <Text style={styles.stickyScoreText}>{(user?.totalScore ?? 0).toLocaleString()} Puan</Text>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060816' },
  safeArea: { flex: 1 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 100 }, // Footer çakışmasın diye alt boşluk artırıldı kanka
  backButton: { marginBottom: 12, alignSelf: 'flex-start' },
  backText: { color: '#8b5cf6', fontSize: 14, fontWeight: '700' },
  title: { color: '#fff', fontSize: 26, fontWeight: '800' },
  subtitle: { color: '#94a3b8', fontSize: 14, marginTop: 4, marginBottom: 18 },
  
  // Podyum Stilleri
  podiumCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 16 },
  firstPlace: { alignItems: 'center', paddingVertical: 18, backgroundColor: 'rgba(245, 158, 11, 0.12)', borderRadius: 20, marginBottom: 12, borderWidth: 1.5, borderColor: '#fbbf24', shadowColor: '#fbbf24', shadowOpacity: 0.2, shadowRadius: 15, elevation: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  secondPlace: { flex: 1, marginRight: 6, alignItems: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: 'rgba(148, 163, 184, 0.08)', borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.2)' },
  thirdPlace: { flex: 1, marginLeft: 6, alignItems: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: 'rgba(191, 219, 254, 0.06)', borderWidth: 1, borderColor: 'rgba(191, 219, 254, 0.15)' },
  podiumBadge: { color: '#fbbf24', fontSize: 16, fontWeight: '900', marginBottom: 8 },
  podiumBadge_sub: { color: '#94a3b8', fontSize: 13, fontWeight: '800', marginBottom: 8 },
  podiumName: { color: '#f8fafc', fontSize: 14, fontWeight: '700', marginTop: 6, maxWidth: 100 },
  podiumScore: { color: '#a78bfa', fontSize: 13, fontWeight: '600', marginTop: 2 },
  
  // Liste Satır Stilleri
  playerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  rank: { color: '#8b5cf6', fontWeight: '800', width: 42, fontSize: 14 },
  avatarImg: { width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.05)' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#060816' },
  playerName: { flex: 1, color: '#f8fafc', fontWeight: '700', fontSize: 15 },
  playerScore: { color: '#cbd5e1', fontWeight: '700', fontSize: 14 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 14 },

  // 🎯 YENİ LİG GÖRSEL EFEKTLERİ STİLLERİ
  top10Border: { borderColor: 'rgba(251, 191, 36, 0.25)', backgroundColor: 'rgba(251, 191, 36, 0.02)' }, // İlk 10 şatafat çerçevesi
  myRowAnchor: { borderColor: '#67e8f9', borderWidth: 1.5, backgroundColor: 'rgba(103, 232, 249, 0.08)' }, // İlk 100'deyken kendimi parlatan çizgi
  myHighlightedCard: { borderColor: '#67e8f9', borderWidth: 2, backgroundColor: 'rgba(103, 232, 249, 0.12)' }, // Kürsüde 1.yken benim kartım
  myHighlightedCard_sub: { borderColor: '#67e8f9', borderWidth: 1.5, backgroundColor: 'rgba(103, 232, 249, 0.08)' }, // Kürsüde 2 veya 3.yken benim kartım

  // 🎯 STICKY FOOTER STİLLERİ (En Alta Sabitlenen 502. Sıra Paneli)
  stickyRankFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: '#0b0f26', padding: 14, borderTopWidth: 2, borderColor: '#67e8f9', paddingBottom: 20, shadowColor: '#67e8f9', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  stickyRankText: { color: '#67e8f9', fontWeight: '900', fontSize: 16, width: 45 },
  stickyNameText: { flex: 1, color: '#67e8f9', fontWeight: '800', fontSize: 15 },
  stickyScoreText: { color: '#fff', fontWeight: '800', fontSize: 14 }
});