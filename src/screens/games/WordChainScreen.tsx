import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useWordChainMatch } from '../../hooks/useWordChainMatch';
import { joinMatchmakingQueue, leaveMatchmakingQueue } from '../../services/matchmakingService';

const REASON_MESSAGES: Record<string, string> = {
  not_your_turn: 'Sıra rakipte, biraz bekle.',
  invalid_chain: 'Kelime, önceki kelimenin son harfiyle başlamalı.',
  already_used: 'Bu kelime daha önce kullanıldı.',
  not_a_word: 'Bu kelime sözlükte bulunamadı.',
  unknown: 'Bir sorun oluştu, tekrar dene.',
};

export default function WordChainScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [matchId, setMatchId] = useState('');
  const [searching, setSearching] = useState(true);
  const [opponentName, setOpponentName] = useState('Rakip');
  const [statusMsg, setStatusMsg] = useState('Rakip aranıyor...');
  const [inputWord, setInputWord] = useState('');
  const [sending, setSending] = useState(false);

  const cleanupRef = useRef<null | (() => Promise<void>)>(null);

  const { match, remainingSeconds, submitWord, isMyTurn, myPlayer, opponentPlayer } = useWordChainMatch(
    matchId,
    user?.uid ?? ''
  );

  useEffect(() => {
    if (!user?.uid) return;
    let active = true;

    joinMatchmakingQueue(
      user.uid,
      user.displayName || 'Oyuncu',
      (result) => {
        if (!active) return;
        setMatchId(result.matchId);
        setOpponentName(result.opponentName);
        setSearching(false);
        setStatusMsg('Rakip bulundu! Oyun başlıyor.');
      },
      (error) => {
        if (!active) return;
        console.error('Eşleştirme hatası:', error);
        setStatusMsg('Rakip bulunamadı, lütfen tekrar dene.');
        setSearching(false);
      }
    ).then((cleanup) => {
      cleanupRef.current = cleanup;
      if (!active) {
        // Ekran bileşen bağlanmadan kapandıysa hemen temizle
        cleanup().catch(() => {});
      }
    });

    return () => {
      active = false;
      if (cleanupRef.current) cleanupRef.current().catch(() => {});
      leaveMatchmakingQueue(user.uid).catch(() => {});
    };
  }, [user?.uid]);

  const handleSubmit = async () => {
    const word = inputWord.trim();
    if (!word || sending) return;
    setSending(true);
    try {
      const result = await submitWord(word);
      if (result.ok) {
        setInputWord('');
        setStatusMsg('Harika hamle!');
      } else {
        setStatusMsg(REASON_MESSAGES[result.reason] ?? REASON_MESSAGES.unknown);
      }
    } finally {
      setSending(false);
    }
  };

  const isFinished = match?.status === 'finished';
  const iWon = isFinished && match?.winnerUid === user?.uid;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060816" />
      <View style={styles.content}>
        <Pressable style={styles.backButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backText}>← Ana Sayfa</Text>
        </Pressable>

        <Text style={styles.eyebrow}>OYUN MODU</Text>
        <Text style={styles.title}>Kelime Zinciri</Text>
        <Text style={styles.subtitle}>Bir kelimeyle başlayıp zinciri en uzun sürdüren ol.</Text>

        {searching ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#22d3ee" />
            <Text style={styles.searchingText}>{statusMsg}</Text>
          </View>
        ) : !match ? (
          <View style={styles.centerBox}>
            <Text style={styles.searchingText}>{statusMsg}</Text>
            <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Home')}>
              <Text style={styles.primaryButtonText}>Lobiye Dön</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.scoreRow}>
              <View style={styles.scoreBox}>
                <Text style={styles.scoreLabel}>Sen</Text>
                <Text style={styles.scoreValue}>{myPlayer?.score ?? 0}</Text>
              </View>
              <View style={styles.timerBox}>
                <Text style={styles.timerValue}>{Math.ceil(remainingSeconds)}</Text>
                <Text style={styles.scoreLabel}>saniye</Text>
              </View>
              <View style={styles.scoreBox}>
                <Text style={styles.scoreLabel}>{opponentName}</Text>
                <Text style={styles.scoreValue}>{opponentPlayer?.score ?? 0}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Mevcut kelime</Text>
              <Text style={styles.word}>{match.currentWord ?? '—'}</Text>
              <Text style={styles.hint}>
                {isFinished
                  ? iWon
                    ? '🏆 Kazandın! Tebrikler.'
                    : '💔 Kaybettin, bir dahaki sefere!'
                  : isMyTurn
                  ? 'Sıra sende: son harfle başlayan bir kelime yaz.'
                  : `Sıra ${opponentName}'de, bekle.`}
              </Text>
            </View>

            {!isFinished ? (
              <>
                <TextInput
                  style={styles.input}
                  value={inputWord}
                  onChangeText={setInputWord}
                  placeholder="Kelime yaz..."
                  placeholderTextColor="#64748b"
                  editable={isMyTurn && !sending}
                  autoCapitalize="none"
                  onSubmitEditing={handleSubmit}
                  returnKeyType="send"
                />
                <Pressable
                  style={[styles.primaryButton, (!isMyTurn || sending) && styles.primaryButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={!isMyTurn || sending}
                >
                  <Text style={styles.primaryButtonText}>{sending ? 'Gönderiliyor...' : 'Kelime Ekle'}</Text>
                </Pressable>
                <Text style={styles.statusText}>{statusMsg}</Text>
              </>
            ) : (
              <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Home')}>
                <Text style={styles.primaryButtonText}>Lobiye Dön</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060816' },
  content: { flex: 1, padding: 20 },
  backButton: { marginBottom: 12, alignSelf: 'flex-start' },
  backText: { color: '#67e8f9', fontSize: 14, fontWeight: '700' },
  eyebrow: { color: '#8b5cf6', fontSize: 12, fontWeight: '700', letterSpacing: 1.4, marginBottom: 8 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800' },
  subtitle: { color: '#94a3b8', fontSize: 14, marginTop: 4, marginBottom: 16 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  searchingText: { color: '#cbd5e1', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  scoreBox: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  scoreLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  scoreValue: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 2 },
  timerBox: { alignItems: 'center', marginHorizontal: 12 },
  timerValue: { color: '#22d3ee', fontSize: 28, fontWeight: '900' },
  card: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginBottom: 18 },
  cardLabel: { color: '#67e8f9', fontWeight: '700', marginBottom: 4 },
  word: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 10, textTransform: 'capitalize' },
  hint: { color: '#cbd5e1', fontSize: 14, lineHeight: 20 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 12, fontSize: 16 },
  primaryButton: { backgroundColor: '#22d3ee', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryButtonText: { color: '#07131f', fontSize: 15, fontWeight: '800' },
  statusText: { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 12, fontWeight: '600' },
});
