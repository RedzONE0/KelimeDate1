import { useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StatusBar, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebaseConfig';
import { getRandomGameWord, standardizeWord, WordEntry } from '../../utils/wordValidator';

const alphabet = 'ABCÇDEFGĞHİIJKLMNOÖPRSŞTUÜVYZ'.split('');

export default function GuessWordScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  
  const [wordData, setWordData] = useState<WordEntry | null>(null);
  const [revealedLetters, setRevealedLetters] = useState<string[]>([]);
  const [usedLetters, setUsedLetters] = useState<string[]>([]);
  const [lives, setLives] = useState(5);
  const [score, setScore] = useState(0);
  const [gameFinished, setGameFinished] = useState(false);
  const [message, setMessage] = useState('Yeni kelimeyi çözmeye başla.');
  const [submitting, setSubmitting] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const loadWord = () => {
    const nextWord = getRandomGameWord();
    if (nextWord) {
      setWordData(nextWord);
      setRevealedLetters([]);
      setUsedLetters([]);
      setLives(5);
      setScore(0);
      setGameFinished(false);
      setMessage('Yeni kelime hazır.');
    }
  };

  useEffect(() => {
    loadWord();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const displayedWord = useMemo(() => {
    if (!wordData) return '';
    return wordData.word
      .split('')
      .map((letter) => {
        const stdLetter = standardizeWord(letter);
        return revealedLetters.includes(stdLetter) ? letter.toUpperCase() : '_';
      })
      .join(' ');
  }, [revealedLetters, wordData]);

  const saveGameResultToFirebase = async (isSolved: boolean, finalScore: number) => {
    if (!user?.uid || user.uid === 'guest') return;
    setSubmitting(true);

    try {
      const userDocRef = db.collection('users').doc(user.uid);
      
      if (isSolved) {
        await userDocRef.update({
          totalScore: firestore.FieldValue.increment(finalScore),
          gamesPlayed: firestore.FieldValue.increment(1),
          gamesWon: firestore.FieldValue.increment(1),
        });
      } else {
        await userDocRef.update({
          gamesPlayed: firestore.FieldValue.increment(1),
        });
      }

      await db.collection('matches').add({
        createdAt: new Date().toISOString(),
        gameMode: 'kelime_tahmini',
        winnerUid: isSolved ? user.uid : null,
        loserUid: isSolved ? null : user.uid,
        winnerName: isSolved ? user.displayName : 'Sistem',
        loserName: isSolved ? 'Sistem' : user.displayName,
        pointsEarned: isSolved ? finalScore : 0,
        word: wordData?.word || '',
        livesLeft: lives,
      });

    } catch (error) {
      console.error('Oyun skoru kaydedilirken hata:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLetterPress = (letter: string) => {
    if (!wordData || gameFinished || submitting) return;

    const stdLetter = standardizeWord(letter);
    if (usedLetters.includes(stdLetter)) return;

    const nextUsedLetters = [...usedLetters, stdLetter];
    setUsedLetters(nextUsedLetters);

    const targetWordClean = standardizeWord(wordData.word);

    if (targetWordClean.includes(stdLetter)) {
      const nextRevealed = Array.from(new Set([...revealedLetters, stdLetter]));
      setRevealedLetters(nextRevealed);
      setScore((prev) => prev + 120);
      setMessage(`Harika! ${letter} harfi doğru.`);

      const allLettersRevealed = targetWordClean.split('').every((char) => nextRevealed.includes(char));
      if (allLettersRevealed) {
        setGameFinished(true);
        setMessage('Tebrikler! Kelimeyi çözdün. 🎉');
        void saveGameResultToFirebase(true, score + 120);
      }
      return;
    }

    const nextLives = lives - 1;
    setLives(nextLives);
    setScore((prev) => Math.max(0, prev - 40));
    setMessage(`${letter} harfi yanlış. Canın azaldı. 💔`);

    if (nextLives <= 0) {
      setGameFinished(true);
      setMessage(`Canların bitti! Doğru kelime: ${wordData.word.toUpperCase()}`);
      void saveGameResultToFirebase(false, 0);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060816" />
      <View style={styles.content}>
        <Pressable style={styles.backButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backText}>← Lobiye Dön</Text>
        </Pressable>

        <Text style={styles.eyebrow}>KELİMEDATE OYUN MODU</Text>
        <Text style={styles.title}>Kelime Tahmini</Text>
        <Text style={styles.subtitle}>İpucunu oku, harfleri aç ve gizli kelimeyi çöz.</Text>

        <Animated.View style={[styles.card, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>İPUCU</Text>
            <Text style={styles.scoreText}>{score} PUAN</Text>
          </View>
          <Text style={styles.cardValue}>{wordData?.meaning ?? 'Kelime yükleniyor...'}</Text>
          
          <Text style={styles.wordText}>{displayedWord}</Text>
          <Text style={styles.livesText}>Kalan Can: {'❤️'.repeat(lives)}</Text>
        </Animated.View>

        <View style={styles.statusBox}>
          {submitting ? (
            <ActivityIndicator size="small" color="#8b5cf6" />
          ) : (
            <Text style={styles.statusText}>{message}</Text>
          )}
        </View>

        <View style={styles.letterGrid}>
          {alphabet.map((letter) => {
            const stdLetter = standardizeWord(letter);
            const isUsed = usedLetters.includes(stdLetter);
            const isCorrect = wordData ? standardizeWord(wordData.word).includes(stdLetter) : false;
            
            return (
              <Pressable
                key={letter}
                style={[
                  styles.letterButton,
                  isUsed && (isCorrect ? styles.letterButtonCorrect : styles.letterButtonWrong),
                  (gameFinished || submitting) && styles.letterButtonDisabled,
                ]}
                onPress={() => handleLetterPress(letter)}
                disabled={gameFinished || isUsed || submitting}
              >
                <Text style={styles.letterText}>{letter}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.restartButton} onPress={loadWord} disabled={submitting}>
          <Text style={styles.restartText}>Sonraki Kelime ➡️</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060816' },
  content: { flex: 1, padding: 20 },
  backButton: { marginBottom: 12, alignSelf: 'flex-start' },
  backText: { color: '#8b5cf6', fontSize: 14, fontWeight: '700' },
  eyebrow: { color: '#8b5cf6', fontSize: 12, fontWeight: '700', letterSpacing: 1.4, marginBottom: 8 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800' },
  subtitle: { color: '#94a3b8', fontSize: 14, marginTop: 4, marginBottom: 16 },
  card: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardLabel: { color: '#8b5cf6', fontWeight: '700', letterSpacing: 1 },
  scoreText: { color: '#fff', fontWeight: '800' },
  cardValue: { color: '#f8fafc', fontSize: 15, lineHeight: 22, marginBottom: 14, fontWeight: '500' },
  wordText: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: 4, marginTop: 10, marginBottom: 14, textAlign: 'center' },
  livesText: { color: '#fda4af', fontSize: 13, fontWeight: '700' },
  statusBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', height: 44, justifyContent: 'center' },
  statusText: { color: '#e2e8f0', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  letterGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginVertical: 6 },
  letterButton: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  letterButtonCorrect: { backgroundColor: 'rgba(34, 197, 94, 0.2)', borderColor: '#22c55e' },
  letterButtonWrong: { backgroundColor: 'rgba(248, 113, 113, 0.15)', borderColor: '#f87171' },
  letterButtonDisabled: { opacity: 0.4 },
  letterText: { color: '#fff', fontWeight: '800' },
  restartButton: { marginTop: 16, backgroundColor: '#22d3ee', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  restartText: { color: '#07131f', fontSize: 15, fontWeight: '800' },
});