import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StatusBar, StyleSheet, Text, View, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore'; // Engelleme arrayUnion işlemi için
import { useAuth } from '../contexts/AuthContext'; // 🎯 Gerçek kullanıcı verileri için
import { db } from '../services/firebaseConfig';
import { getAvatarById } from '../constants/avatars'; // 🎯 Fütüristik görseller için

const basariListesi = ['3 günlük seri', 'Kelime kralı', 'Takım oyuncusu'];

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth(); // Aktif giriş yapmış kullanıcı ve çıkış fonksiyonu
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 45, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Kullanıcının seçtiği fütüristik avatarı çekiyoruz
  const avatarInfo = getAvatarById(user?.avatarId ?? 'avatar-1');

  // Gerçek kazanma oranını hesaplayan küçük akıllı matematik
  const winRate = user?.gamesPlayed && user.gamesPlayed > 0 
    ? Math.round((user.gamesWon / user.gamesPlayed) * 100) 
    : 0;

  // 🛡️ GÜVENLİK AKSİYONU: Kötü niyetli bir kullanıcıyı UID ile engelleme motoru
  const handleBlockUser = async () => {
    Alert.prompt(
      "Kullanıcı Engelle",
      "Engellemek istediğin kullanıcının benzersiz ID'sini (UID) girin:",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Engelle",
          style: "destructive",
          onPress: async (targetUid: string | undefined) => {
            if (!targetUid || !user?.uid) return;
            if (targetUid.trim() === user.uid) {
              Alert.alert("Hata", "Kendini engelleyemezsin kanka! 😄");
              return;
            }

            setLoading(true);
            try {
              // Firestore'daki blockedUsers dizisine yeni engelleneni ekliyoruz
              await db.collection('users').doc(user.uid).update({
                blockedUsers: firestore.FieldValue.arrayUnion(targetUid.trim())
              });
              Alert.alert("Başarılı", "Kullanıcı engellendi. Sohbet odalarında onunla olan mesaj kutuların artık gizlenecek! 🛡️");
            } catch (error) {
              console.error(error);
              Alert.alert("Hata", "Kullanıcı engellenirken bir sorun oluştu.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Güvenli Çıkış Yapma Fonksiyonu
  const handleSignOut = () => {
    Alert.alert("Çıkış Yap", "Kelimedate dünyasından ayrılmak istediğine emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Çıkış Yap", style: "destructive", onPress: () => signOut() }
    ]);
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#060816" />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable style={styles.backButton} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.backText}>← Ana Sayfa</Text>
          </Pressable>

          {/* 🔮 FÜTÜRİSTİK AVATARLI KART ALANI */}
          <View style={styles.heroCard}>
            <View style={[styles.avatar, { borderColor: avatarInfo?.accentColor || '#8b5cf6' }]}>
              {avatarInfo?.imageSource ? (
                <Image source={avatarInfo.imageSource} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>🤖</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              {/* Sabit isim yerine veri tabanındaki ismi basıyoruz */}
              <Text style={styles.name}>{user?.displayName || 'Oyuncu'}</Text>
              <Text style={styles.level}>
                🧬 Cinsiyet: {user?.gender === 'erkek' ? 'Erkek' : user?.gender === 'kadın' ? 'Kadın' : 'Gizli'}
              </Text>
            </View>
          </View>

          {/* 📊 VERİ TABANINDAN GELEN GERÇEK İSTATİSTİKLER */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}><Text style={styles.statValue}>%{winRate}</Text><Text style={styles.statLabel}>Başarı</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{user?.gamesPlayed ?? 0}</Text><Text style={styles.statLabel}>Maç</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{user?.totalScore ?? 0}</Text><Text style={styles.statLabel}>Puan</Text></View>
          </View>

          {/* SENİN HARİKA BAŞARI KARTIN */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Başarılar</Text>
            {basariListesi.map((item) => (
              <View key={item} style={styles.badgeRow}>
                <Text style={styles.badgeIcon}>✨</Text>
                <Text style={styles.badgeText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* SENİN HARİKA PERFORMANS KARTIN */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Son performans</Text>
            <Text style={styles.bodyText}>
              Kelimedate profilin tamamen senkronize edildi kanka! Boyun {user?.heightCm || '—'} cm, kilon {user?.weightKg || '—'} kg olarak kaydedildi. Hobilerin: {user?.hobbies?.join(', ') || 'Henüz seçilmedi'}.
            </Text>
          </View>

          {/* 🛡️ GÜVENLİK VE ÇIŞ BUTONLARI ALANI */}
          <View style={styles.actionRow}>
            <Pressable style={styles.blockButton} onPress={handleBlockUser} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.blockButtonText}>🛡️ Rahatsız Edeni Engelle</Text>}
            </Pressable>

            <Pressable style={styles.signOutButton} onPress={handleSignOut}>
              <Text style={styles.signOutButtonText}>🚪 Güvenli Çıkış Yap</Text>
            </Pressable>
          </View>

        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060816' },
  safeArea: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  backButton: { marginBottom: 16, alignSelf: 'flex-start' },
  backText: { color: '#8b5cf6', fontSize: 14, fontWeight: '700' },
  heroCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  
  // Avatar Tasarımı
  avatar: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 2, backgroundColor: 'rgba(255,255,255,0.05)' },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  
  name: { color: '#fff', fontSize: 20, fontWeight: '800' },
  level: { color: '#94a3b8', fontSize: 13, marginTop: 4, fontWeight: '600' },
  statsRow: { flexDirection: 'row', marginTop: 14, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 12, alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)' },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '800' },
  statLabel: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  sectionCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  sectionTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700', marginBottom: 10 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  badgeIcon: { fontSize: 16, marginRight: 8 },
  badgeText: { color: '#e2e8f0', fontSize: 14 },
  bodyText: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },
  
  // Aksiyon Butonları
  actionRow: { marginTop: 10, gap: 10 },
  blockButton: { backgroundColor: 'rgba(244, 63, 94, 0.1)', borderRadius: 16, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.25)' },
  blockButtonText: { color: '#fb7185', fontSize: 14, fontWeight: '700' },
  signOutButton: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  signOutButtonText: { color: '#cbd5e1', fontSize: 14, fontWeight: '700' },
});