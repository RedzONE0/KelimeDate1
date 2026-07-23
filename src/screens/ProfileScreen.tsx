import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { 
  Animated, 
  Easing, 
  Pressable, 
  ScrollView, 
  StatusBar, 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  Alert, 
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore'; 
import { useAuth } from '../contexts/AuthContext'; 
import { db } from '../services/firebaseConfig';
import { avatars, getAvatarById } from '../constants/avatars'; 

const basariListesi = ['3 günlük seri', 'Kelime kralı', 'Takım oyuncusu'];

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut, updateProfileData } = useAuth(); 
  const [loading, setLoading] = useState(false);

  // 🎯 DÜZENLEME STATE'LERİ
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false); // Avatar seçici pop-up durumu
  const [bioText, setBioText] = useState(user?.bio ?? ''); // Siber biyografi metni
  const [hobbyInput, setHobbyInput] = useState(''); // Yeni hobi ekleme kutusu
  const [myHobbies, setMyHobbies] = useState<string[]>(user?.hobbies || []);
  const [isEditing, setIsEditing] = useState(false); // Düzenleme modu açık mı?
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false); // UID ile engelleme pop-up'ı (Android uyumlu)
  const [blockUidInput, setBlockUidInput] = useState('');

  // Profil verisi (bio/hobiler) güncellendiğinde ekranı senkron tut
  useEffect(() => {
    if (!isEditing) {
      setBioText(user?.bio ?? '');
      setMyHobbies(user?.hobbies ?? []);
    }
  }, [user?.bio, user?.hobbies, isEditing]);

  // Animasyon referansları
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 45, friction: 10, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1.12, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [fadeAnim, slideAnim, glowAnim]);

  const avatarInfo = getAvatarById(user?.avatarId ?? 'avatar-1');

  const winRate = user?.gamesPlayed && user.gamesPlayed > 0 
    ? Math.round((user.gamesWon / user.gamesPlayed) * 100) 
    : 0;

  // 🎯 DÜZELTME 1: GERÇEK VE DOĞRUDAN AVATAR DEĞİŞTİRME MOTORU (İsmi Benzersiz Yapıldı)
  const handleSaveAvatar = async (avatarId: string) => {
    setLoading(true);
    try {
      await updateProfileData({ avatarId }); // Sadece seçilen avatarID değerini Firestore'a uçurur
      setIsAvatarModalOpen(false);
      Alert.alert("Başarılı", "Siber kimliğin güncellendi kanka! 🌌"); // Karizmatik cümle buraya da mühürlendi!
    } catch (error) {
      Alert.alert("Hata", "Avatar güncellenemedi kanka.");
    } finally {
      setLoading(false);
    }
  };

  // 🎯 YENİ HOBİ ETİKETİ EKLEME
  const handleAddHobby = () => {
    const cleanHobby = hobbyInput.trim().toLowerCase();
    if (!cleanHobby) return;
    if (myHobbies.includes(cleanHobby)) {
      setHobbyInput('');
      return;
    }
    const previous = myHobbies;
    const updated = [...myHobbies, cleanHobby];
    setMyHobbies(updated);
    setHobbyInput('');
    updateProfileData({ hobbies: updated }).catch(() => {
      setMyHobbies(previous); // hata olursa yerel durumu geri al
      Alert.alert('Hata', 'Hobi kaydedilemedi, tekrar dene.');
    });
  };

  // 🎯 HOBİ ETİKETİ SİLME
  const handleRemoveHobby = (hobi: string) => {
    const previous = myHobbies;
    const updated = myHobbies.filter(item => item !== hobi);
    setMyHobbies(updated);
    updateProfileData({ hobbies: updated }).catch(() => {
      setMyHobbies(previous);
      Alert.alert('Hata', 'Hobi silinemedi, tekrar dene.');
    });
  };

  // 🎯 DÜZELTME 2: TÜM PROFİLİ (BİO DAHİL) KAYDETME MOTORU (İsimler Çakışmıyor)
  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await updateProfileData({
        bio: bioText.trim(),
        hobbies: myHobbies
      });
      
      setIsEditing(false);
      Keyboard.dismiss();
      Alert.alert("Başarılı", "Siber kimliğin güncellendi kanka! 🌌"); // Favori cümlen burada da güvende!
    } catch (error) {
      Alert.alert("Hata", "Profil kaydedilirken bir sorun oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // 🛡️ Engelleme akışı — Alert.prompt yalnızca iOS'ta çalıştığı için
  // Android'de de çalışan bir Modal + TextInput ile UID alıyoruz.
  const handleBlockUser = () => {
    setBlockUidInput('');
    setIsBlockModalOpen(true);
  };

  const confirmBlockUser = async () => {
    const targetUid = blockUidInput.trim();
    if (!targetUid || !user?.uid) return;
    if (targetUid === user.uid) {
      Alert.alert("Hata", "Kendini engelleyemezsin kanka! 😄");
      return;
    }
    setIsBlockModalOpen(false);
    setLoading(true);
    try {
      await db.collection('users').doc(user.uid).update({
        blockedUsers: firestore.FieldValue.arrayUnion(targetUid)
      });
      Alert.alert("Başarılı", "Kullanıcı engellendi. 🛡️");
    } catch (error) {
      Alert.alert("Hata", "Kullanıcı engellenirken bir sorun oluştu.");
    } finally {
      setLoading(false);
    }
  };

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
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <Pressable style={styles.backButton} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.backText}>← Ana Sayfa</Text>
          </Pressable>

          <View style={styles.heroCard}>
            <Pressable style={styles.avatarWrapper} onPress={() => setIsAvatarModalOpen(true)}>
              <Animated.View 
                style={[
                  styles.avatarGlow, 
                  { 
                    transform: [{ scale: glowAnim }], 
                    backgroundColor: avatarInfo?.accentColor || '#8b5cf6' 
                  }
                ]} 
              />
              <View style={[styles.avatar, { borderColor: avatarInfo?.accentColor || '#8b5cf6' }]}>
                {avatarInfo?.imageSource ? (
                  <Image source={avatarInfo.imageSource} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>🤖</Text>
                )}
              </View>
              <View style={[styles.editIconBadge, { backgroundColor: avatarInfo?.accentColor || '#8b5cf6' }]}>
                <Text style={styles.editIconText}>🔄</Text>
              </View>
            </Pressable>
            
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={styles.name}>{user?.displayName || 'Oyuncu'}</Text>
              <View style={styles.genderTag}>
                <Text style={styles.genderTagText}>
                  🧬 Cinsiyet: {user?.gender === 'erkek' ? 'Erkek' : user?.gender === 'kadın' ? 'Kadın' : 'Gizli'}
                </Text>
              </View>
            </View>

             {/* Profil Düzenleme Modunu Açma/Kapatma Butonu */}
            <Pressable 
              style={[styles.editModeButton, isEditing && { borderColor: '#22c55e' }]} 
              onPress={isEditing ? handleSaveProfile : () => setIsEditing(true)}
            >
              <Text style={[styles.editModeButtonText, isEditing && { color: '#22c55e' }]}>
                {isEditing ? '✔ Kaydet' : '⚙ Düzenle'}
              </Text>
            </Pressable>
          </View>

          {/* 🔋 Kapsül Tipi İstatistik Pod Stilleri */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderBottomWidth: 3, borderBottomColor: '#22c55e' }]}>
              <Text style={styles.statValue}>%{winRate}</Text>
              <Text style={styles.statLabel}>Başarı Oranı</Text>
            </View>
            <View style={[styles.statCard, { borderBottomWidth: 3, borderBottomColor: '#8b5cf6' }]}>
              <Text style={styles.statValue}>{user?.gamesPlayed ?? 0}</Text>
              <Text style={styles.statLabel}>Toplam Maç</Text>
            </View>
            <View style={[styles.statCard, { borderBottomWidth: 3, borderBottomColor: '#67e8f9' }]}>
              <Text style={styles.statValue}>{user?.totalScore ?? 0}</Text>
              <Text style={styles.statLabel}>Toplam Puan</Text>
            </View>
          </View>

          {/* 📝 Siber Biyografi (Kendinden Bahsetme Kutusu) */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Siber Biyografi</Text>
            {isEditing ? (
              <TextInput
                style={styles.bioInput}
                value={bioText}
                onChangeText={setBioText}
                placeholder="Diğer siber zihinlere kendinden bahset kanka..."
                placeholderTextColor="#64748b"
                multiline
                maxLength={150}
              />
            ) : (
              <Text style={[styles.bodyText, !bioText && { fontStyle: 'italic', color: '#64748b' }]}>
                {bioText || 'Buraya henüz bir siber cümle bırakılmamış kanka.'}
              </Text>
            )}
          </View>

          {/* 🏷️ Dinamik İlgi Alanları ve Hobi Etiketleri */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>İlgi Alanı Etiketleri</Text>
            
            {isEditing && (
              <View style={styles.addHobbyRow}>
                <TextInput
                  style={styles.hobbyInput}
                  value={hobbyInput}
                  onChangeText={setHobbyInput}
                  placeholder="Yeni hobi etiketi yaz kanka..."
                  placeholderTextColor="#64748b"
                  onSubmitEditing={handleAddHobby}
                  returnKeyType="done"
                  maxLength={20}
                />
                <Pressable style={styles.addHobbyButton} onPress={handleAddHobby}>
                  <Text style={styles.addHobbyButtonText}>+</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.chipsContainer}>
              {myHobbies.length > 0 ? (
                myHobbies.map((hobi) => (
                  <TouchableOpacity 
                    key={hobi} 
                    style={styles.neonChip} 
                    onPress={() => isEditing && handleRemoveHobby(hobi)}
                    disabled={!isEditing}
                  >
                    <Text style={styles.neonChipText}>
                      # {hobi} {isEditing ? ' ×' : ''}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={[styles.bodyText, { fontStyle: 'italic', fontSize: 12, color: '#64748b' }]}>
                  Henüz hobi etiketi eklenmemiş kanka.
                </Text>
              )}
            </View>
          </View>

          {/* Siber Başarılar Kartı */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Siber Başarılar</Text>
            {basariListesi.map((item) => (
              <View key={item} style={styles.badgeRow}>
                <Text style={styles.badgeIcon}>✨</Text>
                <Text style={styles.badgeText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* 🛡️ Güvenlik Ve Çıkış Butonları Alanı */}
          <View style={styles.actionRow}>
            <Pressable style={styles.blockButton} onPress={handleBlockUser} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.blockButtonText}>🛡️ Rahatsız Edeni Engelle</Text>}
            </Pressable>
            <Pressable style={styles.signOutButton} onPress={handleSignOut}>
              <Text style={styles.signOutButtonText}>🚪 Güvenli Çıkış Yap</Text>
            </Pressable>
          </View>

          {/* 🛡️ POP-UP MODAL: Android uyumlu UID ile engelleme */}
          <Modal visible={isBlockModalOpen} transparent animationType="fade" onRequestClose={() => setIsBlockModalOpen(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Kullanıcı Engelle</Text>
                <Text style={styles.modalSubtitle}>Engellemek istediğin kullanıcının benzersiz ID'sini (UID) gir:</Text>
                <TextInput
                  style={styles.bioInput}
                  value={blockUidInput}
                  onChangeText={setBlockUidInput}
                  placeholder="Kullanıcı UID"
                  placeholderTextColor="#64748b"
                  autoCapitalize="none"
                />
                <Pressable style={[styles.blockButton, { marginTop: 14, width: '100%' }]} onPress={confirmBlockUser}>
                  <Text style={styles.blockButtonText}>Engelle</Text>
                </Pressable>
                <Pressable style={styles.modalCloseButton} onPress={() => setIsBlockModalOpen(false)}>
                  <Text style={styles.modalCloseButtonText}>Vazgeç</Text>
                </Pressable>
              </View>
            </View>
          </Modal>

          {/* 🔄 POP-UP MODAL: Fütüristik Avatar Seçim Matrisi */}
          <Modal visible={isAvatarModalOpen} transparent animationType="fade" onRequestClose={() => setIsAvatarModalOpen(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Siber Avatarını Güncelle</Text>
                <Text style={styles.modalSubtitle}>Kelimedate evrenindeki yeni yüzünü seç kanka:</Text>
                
                <View style={styles.avatarGrid}>
                  {avatars.map((av) => (
                    <TouchableOpacity 
                      key={av.id} 
                      style={[
                        styles.modalAvatarItem, 
                        user?.avatarId === av.id && { borderColor: av.accentColor, borderWidth: 3 }
                      ]}
                      onPress={() => handleSaveAvatar(av.id)} // 🎯 DÜZELTME: Doğru ve yeni fonksiyona bağlandı!
                    >
                      <Image source={av.imageSource} style={styles.modalAvatarImage} />
                      <Text style={styles.modalAvatarName}>{av.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Pressable style={styles.modalCloseButton} onPress={() => setIsAvatarModalOpen(false)}>
                  <Text style={styles.modalCloseButtonText}>Vazgeç</Text>
                </Pressable>
              </View>
            </View>
          </Modal>

        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

// 🎯 SENİN ORİJİNAL VE PREMIUM TERCİH ETTİĞİN SİBERPUNK STİLLERİN TAMAMI
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060816' },
  safeArea: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  backButton: { marginBottom: 16, alignSelf: 'flex-start' },
  backText: { color: '#8b5cf6', fontSize: 14, fontWeight: '700' },
  
  heroCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  avatarWrapper: { width: 64, height: 64, marginRight: 14, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarGlow: { position: 'absolute', width: 60, height: 60, borderRadius: 30, opacity: 0.15 },
  avatar: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 2, backgroundColor: 'rgba(255,255,255,0.05)', zIndex: 2 },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  
  editIconBadge: { position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', zIndex: 3, borderWidth: 1.5, borderColor: '#060816' },
  editIconText: { fontSize: 11 },
  editModeButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(255,255,255,0.02)' },
  editModeButtonText: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },

  name: { color: '#fff', fontSize: 20, fontWeight: '800' },
  genderTag: { marginTop: 4 },
  genderTagText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  
  statsRow: { flexDirection: 'row', marginTop: 14, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 12, alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)' },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '800' },
  statLabel: { color: '#94a3b8', fontSize: 11, marginTop: 4, fontWeight: '600', letterSpacing: 0.5 },
  
  sectionCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  sectionTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700', marginBottom: 10 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  badgeIcon: { fontSize: 16, marginRight: 8 },
  badgeText: { color: '#e2e8f0', fontSize: 14 },
  bodyText: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },
  
  bioInput: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 12, color: '#fff', fontSize: 14, minHeight: 60, textAlignVertical: 'top', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  addHobbyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  hobbyInput: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  addHobbyButton: { backgroundColor: '#8b5cf6', width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },addHobbyButtonText: { color: '#fff', fontSize: 20, fontWeight: '600' },chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },neonChip: { backgroundColor: 'rgba(103, 232, 249, 0.08)', borderWidth: 1, borderColor: 'rgba(103, 232, 249, 0.2)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5 },neonChipText: { color: '#67e8f9', fontSize: 12, fontWeight: '700' },actionRow: { marginTop: 10, gap: 10 },blockButton: { backgroundColor: 'rgba(244, 63, 94, 0.1)', borderRadius: 16, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.25)' },blockButtonText: { color: '#fb7185', fontSize: 14, fontWeight: '700' },signOutButton: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },signOutButtonText: { color: '#cbd5e1', fontSize: 14, fontWeight: '700' },modalOverlay: { flex: 1, backgroundColor: 'rgba(6, 8, 22, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },modalContent: { width: '100%', backgroundColor: 'rgba(30, 41, 59, 0.7)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', padding: 20, alignItems: 'center' },modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 6 },modalSubtitle: { color: '#94a3b8', fontSize: 13, marginBottom: 18, textAlign: 'center' },avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, width: '100%', marginBottom: 18 },modalAvatarItem: { width: '29%', aspectRatio: 1, borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', padding: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },modalAvatarImage: { width: '75%', height: '75%', resizeMode: 'cover', borderRadius: 10 },modalAvatarName: { color: '#94a3b8', fontSize: 10, marginTop: 4, fontWeight: '600' },modalCloseButton: { backgroundColor: 'rgba(248, 113, 113, 0.1)', borderRadius: 14, paddingVertical: 11, paddingHorizontal: 24, borderWidth: 1, borderColor: 'rgba(248, 113, 113, 0.25)' },modalCloseButtonText: { color: '#fca5a5', fontSize: 14, fontWeight: '700' }});