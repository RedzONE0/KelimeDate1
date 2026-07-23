// src/screens/ChatScreen.tsx (PARÇA 1)
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { sendMessage, subscribeToMessages } from '../services/chatService';
import { getAvatarById } from '../constants/avatars';
import { ChatMessage, ChatRoom } from '../types';

export default function ChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  const [activeTab, setActiveTab] = useState<'group' | 'private'>(route.params?.initialTab ?? 'group');
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [currentRoomId, setCurrentRoomId] = useState<string>(route.params?.initialRoomId ?? 'general-lobby');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 45, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Lobi odalarını dinleme sorgusu
  useEffect(() => {
    if (!user?.uid) return;
    setLoadingRooms(true);

    // 🎯 PERFORMANS: canlı sorguları artık limitliyoruz (eskiden tüm grup odaları sürekli akıyordu).
    let query;
    if (activeTab === 'group') {
      query = db.collection('chatRooms')
        .where('isGroup', '==', true)
        .orderBy('lastMessageAt', 'desc')
        .limit(30);
    } else {
      query = db.collection('chatRooms')
        .where('isGroup', '==', false)
        .where('participants', 'array-contains', user.uid)
        .limit(30);
    }

    const unsubscribe = query.onSnapshot((snapshot) => {
      const loadedRooms: ChatRoom[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      } as ChatRoom));

      loadedRooms.sort((a, b) => {
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return timeB - timeA;
      });

      setRooms(loadedRooms);

      // Seçili oda hala listedeyse koru; değilse ilk odayı seç (parıl parıl seçim sıfırlanmasını önler).
      if (loadedRooms.length > 0) {
        setCurrentRoomId((prev) => (loadedRooms.some((r) => r.id === prev) ? prev : loadedRooms[0].id));
      } else {
        setCurrentRoomId(activeTab === 'group' ? 'general-lobby' : '');
      }
      setLoadingRooms(false);
    }, (error) => {
      console.error("Odalar dinlenirken hata:", error);
      setLoadingRooms(false);
    });

    return () => unsubscribe();
  }, [activeTab, user?.uid]);
  
  //Seçili odanın mesajlarını canlı dinleme
  useEffect(() => {
    if (!currentRoomId) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToMessages(currentRoomId, (nextMessages) => {
      setMessages(nextMessages);
    });

    return unsubscribe;
  }, [currentRoomId]);

  const handleSendMessage = async () => {
    const trimmedText = messageText.trim();
    if (!trimmedText || !user || !currentRoomId) return;

    setMessageText('');

    try {
      await sendMessage({
        chatId: currentRoomId,
        senderUid: user.uid,
        senderName: user.displayName,
        text: trimmedText,
        avatarId: user.avatarId,
      });
    } catch (error) {
      console.error("Mesaj servisinde hata:", error);
    }
  };

  const handleStartNewPrivateChat = () => {
    if (!user) return;
    // Gerçek bir rakip seçmek için liderlik tablosuna yönlendiriyoruz
    // (eskiden sabit bir "test-player-99" DM odası açılıyordu).
    navigation.navigate('Leaderboard');
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#060816" />
        
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable style={styles.backButton} onPress={() => navigation.navigate('Home')}>
              <Text style={styles.backText}>← Lobi</Text>
            </Pressable>
            {activeTab === 'private' && (
              <Pressable style={styles.newChatBtn} onPress={handleStartNewPrivateChat}>
                <Text style={styles.newChatBtnText}>+ Yeni DM</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.title}>Kelimedate Chat</Text>
          <Text style={styles.subtitle}>
            {activeTab === 'group' ? 'Topluluk odalarında eğlenceye katıl' : 'Rakiplerinle birebir flört et'}
          </Text>
        </View>

        <View style={styles.tabRow}>
          <Pressable 
            style={[styles.tabButton, activeTab === 'group' && styles.tabButtonActive]}
            onPress={() => setActiveTab('group')}
          >
            <Text style={[styles.tabText, activeTab === 'group' && styles.tabTextActive]}>Topluluk Odaları</Text>
          </Pressable>
          <Pressable 
            style={[styles.tabButton, activeTab === 'private' && styles.tabButtonActive]}
            onPress={() => setActiveTab('private')}
          >
            <Text style={[styles.tabText, activeTab === 'private' && styles.tabTextActive]}>Özel Mesajlar</Text>
          </Pressable>
        </View>

        {/* 🎛️ ODALARIN YATAY ŞERİDİ (LOBİLER) - GÜVENLİK FİLTRELİ SÜRÜM */}
        <View style={styles.roomsWrapper}>
          {loadingRooms ? (
            <ActivityIndicator size="small" color="#8b5cf6" />
          ) : (
            (() => {
              // 🛡️ AKILLI FİLTRE: Engellediğin kişilerin odalarını listeden tamamen uçurur
              const visibleRooms = rooms.filter((room) => {
                if (room.isGroup) return true; // Topluluk odalarını herkes görsün
                
                if (user?.blockedUsers && user.blockedUsers.length > 0) {
                  const otherUid = room.participants.find(id => id !== user.uid) || '';
                  if (user.blockedUsers.includes(otherUid)) {
                    return false; // Engelliyse gizle
                  }
                }
                return true;
              });

              return (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomsScroll}>
                  {visibleRooms.map((room) => {
                    let name = room.name;
                    if (!room.isGroup && room.participantNames && user?.uid) {
                      const otherUid = room.participants.find(id => id !== user.uid) || '';
                      name = room.participantNames[otherUid] || 'Oyuncu';
                    }
                    const isSelected = room.id === currentRoomId;
                    return (
                      <Pressable 
                        key={room.id} 
                        style={[styles.roomBadge, isSelected && styles.roomBadgeActive]}
                        onPress={() => setCurrentRoomId(room.id)}
                      >
                        <Text style={[styles.roomBadgeText, isSelected && styles.roomBadgeTextActive]}>
                          {room.isGroup ? `💬 ${name}` : `👤 ${name}`}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {visibleRooms.length === 0 && (
                    <Text style={styles.emptyRoomsText}>Henüz aktif bir oda bulunamadı.</Text>
                  )}
                </ScrollView>
              );
            })()
          )}
        </View>

        <FlatList
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          showsVerticalScrollIndicator={false}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item: message }) => {
            const avatar = getAvatarById(message.senderAvatarId ?? 'avatar-1');
            const isMine = message.senderUid === user?.uid;
            return (
              <View style={[styles.messageBubble, isMine ? styles.messageBubbleMine : styles.messageBubbleOther]}>
                <View style={styles.senderRow}>
                  <View style={styles.avatarBadge}>
                    {avatar?.imageSource ? (
                      <Image source={avatar.imageSource} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarFallback}>👤</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.senderName}>{message.senderName}</Text>
                    <Text style={styles.messageText}>{message.text}</Text>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={!loadingRooms ? (
            <Text style={styles.noMessagesText}>Bu odada henüz konuşma geçmedi. İlk mesajı sen at! 🌟</Text>
          ) : null}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={currentRoomId ? "Mesaj yaz..." : "Önce bir oda seçin"}
            placeholderTextColor="#64748b"
            value={messageText}
            onChangeText={setMessageText}
            multiline
            editable={!!currentRoomId}
          />
          <Pressable style={styles.sendButton} onPress={handleSendMessage} disabled={!currentRoomId}>
            <Text style={styles.sendButtonText}>Gönder</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}
// Tasarım Stilleri
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060816' },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { marginBottom: 4, alignSelf: 'flex-start' },
  backText: { color: '#8b5cf6', fontSize: 14, fontWeight: '700' },
  newChatBtn: { backgroundColor: 'rgba(139, 92, 246, 0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.4)' },
  newChatBtnText: { color: '#c084fc', fontSize: 12, fontWeight: '700' },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  tabRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4, marginHorizontal: 20, marginVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  tabButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9 },
  tabButtonActive: { backgroundColor: '#8b5cf6' },
  tabText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  roomsWrapper: { height: 40, marginBottom: 6 },
  roomsScroll: { paddingHorizontal: 20, alignItems: 'center', gap: 8 },
  roomBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  roomBadgeActive: { backgroundColor: 'rgba(139, 92, 246, 0.15)', borderColor: '#8b5cf6' },
  roomBadgeText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  roomBadgeTextActive: { color: '#c084fc', fontWeight: '700' },
  emptyRoomsText: { color: '#475569', fontSize: 12, fontStyle: 'italic' },
  messageList: { flex: 1, paddingHorizontal: 16, marginTop: 4 },
  messageListContent: { paddingBottom: 16 },
  messageBubble: { borderRadius: 18, padding: 12, marginBottom: 10, borderWidth: 1, maxWidth: '85%' },
  messageBubbleMine: { backgroundColor: 'rgba(139, 92, 246, 0.16)', borderColor: 'rgba(139, 92, 246, 0.3)', alignSelf: 'flex-end' },
  messageBubbleOther: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', alignSelf: 'flex-start' },
  senderRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatarBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 10, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarFallback: { fontSize: 17 },
  senderName: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  messageText: { color: '#e2e8f0', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', backgroundColor: '#060816' },
  input: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, color: '#fff', maxHeight: 100, marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sendButton: { backgroundColor: '#8b5cf6', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  sendButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  noMessagesText: { color: '#475569', textAlign: 'center', marginTop: 30, fontSize: 13, paddingHorizontal: 20 },
});
