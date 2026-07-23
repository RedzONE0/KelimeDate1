import { auth, db } from './firebaseConfig';
import firestoreModule from '@react-native-firebase/firestore';
import { GameMatch, GameMode } from '../types';

const sanitizeText = (value: string, maxLength = 80): string => value.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);

export const submitGuessWordResult = async (params: {
  userId: string;
  displayName: string;
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
  const safeName = sanitizeText(params.displayName || 'Oyuncu', 40);
  const userRef = db.collection('users').doc(params.userId);
  const matchRef = db.collection('matches').doc();

  const matchPayload: Omit<GameMatch, 'id' | 'createdAt'> = {
    gameMode: params.gameMode,
    winnerUid: params.solved ? params.userId : null,
    loserUid: params.solved ? null : params.userId,
    winnerName: params.solved ? safeName : 'Sistem',
    loserName: params.solved ? 'Sistem' : safeName,
    winnerScore: params.solved ? params.score : 0,
    loserScore: params.solved ? 0 : params.score,
    earnedPoints: params.score,
    result: params.solved ? 'win' : 'lose',
    durationSeconds: 0,
  };

  // İstatistik güncellemesi ile maç kaydını tek atomik batch'te yazıyoruz;
  // biri yazılıp diğeri yazılmadan kalmasın.
  const batch = db.batch();

  batch.set(
    userRef,
    {
      totalScore: firestoreModule.FieldValue.increment(params.score),
      gamesPlayed: firestoreModule.FieldValue.increment(1),
      gamesWon: firestoreModule.FieldValue.increment(params.solved ? 1 : 0),
    },
    { merge: true }
  );

  batch.set(matchRef, {
    ...matchPayload,
    participants: [params.userId],
    word: safeWord,
    livesLeft: params.livesLeft,
    createdAt: firestoreModule.FieldValue.serverTimestamp(),
  });

  await batch.commit();
};
