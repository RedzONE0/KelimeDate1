import { auth, db } from './firebaseConfig';
import firestoreModule from '@react-native-firebase/firestore';
import { GameMatch, GameMode, User } from '../types';
interface GuessWordPayload {
  id: string;
  word: string;
  meaning: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const fallbackWords: GuessWordPayload[] = [
  { id: 'fallback-1', word: 'OTOBUS', meaning: 'Şehir içi yolcu taşımak için kullanılan ulaşım aracı.', category: 'ulaşım', difficulty: 'easy' },
  { id: 'fallback-2', word: 'KITAP', meaning: 'Yazılı bilgi ve hikâyeleri barındıran basılı veya dijital kaynak.', category: 'eğitim', difficulty: 'easy' },
  { id: 'fallback-3', word: 'RAKET', meaning: 'Tenis veya badminton gibi sporlarda kullanılan vurma aracı.', category: 'spor', difficulty: 'medium' },
  { id: 'fallback-4', word: 'MÜZİK', meaning: 'Seslerin düzenli ve estetik bir şekilde bir araya gelmesi.', category: 'sanat', difficulty: 'easy' },
  { id: 'fallback-5', word: 'GALAXI', meaning: 'Yıldız sistemleri ve gezegenlerden oluşan devasa yapı.', category: 'uzay', difficulty: 'hard' },
];

const normalizeWord = (word: string): string => word.trim().toUpperCase();
const sanitizeText = (value: string, maxLength = 80): string => value.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);

export const fetchRandomGuessWord = async (): Promise<GuessWordPayload> => {
  try {
    const snapshot = await db.collection('guessWords').get();

    if (!snapshot.empty) {
      const docs = snapshot.docs;
      const randomDoc = docs[Math.floor(Math.random() * docs.length)];
      const data = randomDoc.data() as Partial<GuessWordPayload> & { word?: string; meaning?: string; category?: string; difficulty?: 'easy' | 'medium' | 'hard' };

      if (data.word && data.meaning) {
        return {
          id: randomDoc.id,
          word: normalizeWord(data.word),
          meaning: data.meaning,
          category: data.category ?? 'genel',
          difficulty: data.difficulty ?? 'medium',
        };
      }
    }
  } catch (error) {
    console.error('Kelime çekilirken hata oluştu:', error);
  }

  const fallbackWord = fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
  return { ...fallbackWord, word: normalizeWord(fallbackWord.word) };
};

export const submitGuessWordResult = async (params: {
  userId: string;
  score: number;
  solved: boolean;
  word: string;
  gameMode: GameMode;
  livesLeft: number;
}): Promise<void> => {
  const activeUid = auth.currentUser?.uid;
  if (!activeUid || activeUid !== params.userId) {
    throw new Error('Yetkilendirme hatası.');
  }

  const safeWord = sanitizeText(params.word, 40);
  const userRef = db.collection('users').doc(params.userId);

  await userRef.set(
    {
      totalScore: firestoreModule.FieldValue.increment(params.score),
      gamesPlayed: firestoreModule.FieldValue.increment(1),
      gamesWon: firestoreModule.FieldValue.increment(params.solved ? 1 : 0),
    },
    { merge: true }
  );

  const matchPayload: Omit<GameMatch, 'id'> = {
    createdAt: new Date().toISOString(),
    gameMode: params.gameMode,
    winnerUid: params.solved ? params.userId : null,
    loserUid: params.solved ? null : params.userId,
    winnerName: params.solved ? 'Sen' : 'Rakip',
    loserName: params.solved ? 'Rakip' : 'Sen',
    winnerScore: params.solved ? params.score : 0,
    loserScore: params.solved ? 0 : params.score,
    earnedPoints: params.score,
    result: params.solved ? 'win' : 'lose',
    durationSeconds: 0,
  };

  await db.collection('matches').add({
    ...matchPayload,
    word: safeWord,
    createdAt: firestoreModule.FieldValue.serverTimestamp(),
  });
};
