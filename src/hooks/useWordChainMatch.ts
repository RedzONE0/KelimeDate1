import { useEffect, useRef, useState, useCallback } from 'react';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { db } from '../services/firebaseConfig';
import { isValidTurkishWord, standardizeWord } from '../utils/wordValidator';

const MATCHES_COLLECTION = 'wordChainMatches';

type PlayerState = {
  displayName: string;
  score: number;
  alive: boolean;
};

type MatchData = {
  players: Record<string, PlayerState>;
  status: 'active' | 'finished';
  usedWords: string[];
  currentWord: string | null;
  turn: string;
  turnStartedAt: FirebaseFirestoreTypes.Timestamp | null;
  turnDuration: number;
  winnerUid: string | null;
};

type SubmitResult =
  | { ok: true }
  | { ok: false; reason: 'not_your_turn' | 'invalid_chain' | 'already_used' | 'not_a_word' | 'unknown' };

export function useWordChainMatch(matchId: string, myUid: string) {
  const [match, setMatch] = useState<MatchData | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const timeoutClaimedRef = useRef(false); // aynı client'ın timeout'u birden fazla kez tetiklememesi için

  // matchId boşsa (henüz eşleşme yoksa) referansı null tutuyoruz.
  // Firestore'a boş string ID ile `.doc('')` çağırmak native tarafta hataya
  // yol açabildiği için bu kontrol şart.
  const matchRef = matchId ? db.collection(MATCHES_COLLECTION).doc(matchId) : null;

  // 1. Match dokümanını dinle
  useEffect(() => {
    if (!matchRef) {
      setMatch(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = matchRef.onSnapshot(
      (docSnap) => {
        if (docSnap.exists()) {
          setMatch(docSnap.data() as MatchData);
        } else {
          setMatch(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Match dinlenirken hata:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [matchId]);

  // 2. Geri sayımı client tarafında hesapla (serverTimestamp baz alınarak)
  useEffect(() => {
    if (!matchRef || !match || match.status !== 'active' || !match.turnStartedAt) return;

    timeoutClaimedRef.current = false; // yeni tur başladı, timeout kilidini sıfırla

    const interval = setInterval(() => {
      const startedAtMs = match.turnStartedAt!.toMillis();
      const elapsedSeconds = (Date.now() - startedAtMs) / 1000;
      const remaining = Math.max(0, match.turnDuration - elapsedSeconds);
      setRemainingSeconds(remaining);

      if (remaining <= 0 && !timeoutClaimedRef.current) {
        timeoutClaimedRef.current = true;
        claimTimeout(match.turnStartedAt!).catch((err) =>
          console.log('Timeout claim es geçildi (muhtemelen rakip önce yaptı):', err?.message)
        );
      }
    }, 250); // 250ms'de bir güncelle, akıcı geri sayım için yeterli

    return () => clearInterval(interval);
  }, [match?.turnStartedAt, match?.status, matchId]);

  // 3. Süre dolduğunda: sırası gelen oyuncuyu eleyip rakibi kazandır
  const claimTimeout = useCallback(
    async (expectedTurnStartedAt: FirebaseFirestoreTypes.Timestamp) => {
      if (!matchRef) return;

      await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(matchRef);
        const data = snap.data() as MatchData | undefined;
        if (!data || data.status !== 'active') return; // zaten bitmiş

        // Tur değişmiş mi kontrol et (başka biri zaten timeout'u işlemiş veya oyuncu tam zamanında hamle yapmış olabilir)
        if (!data.turnStartedAt || data.turnStartedAt.toMillis() !== expectedTurnStartedAt.toMillis()) {
          return; // artık geçerli değil, es geç
        }

        const timedOutUid = data.turn;
        const opponentUid = Object.keys(data.players).find((uid) => uid !== timedOutUid)!;

        transaction.update(matchRef, {
          status: 'finished',
          winnerUid: opponentUid,
          [`players.${timedOutUid}.alive`]: false,
        });
      });
    },
    [matchId]
  );

  // 4. Hamle gönderme
  const submitWord = useCallback(
    async (rawWord: string): Promise<SubmitResult> => {
      if (!matchRef) return { ok: false, reason: 'unknown' };

      const word = standardizeWord(rawWord);
      if (!word) return { ok: false, reason: 'not_a_word' };

      try {
        return await db.runTransaction(async (transaction) => {
          const snap = await transaction.get(matchRef);
          const data = snap.data() as MatchData | undefined;
          if (!data || data.status !== 'active') {
            return { ok: false, reason: 'unknown' };
          }

          // Sıra kontrolü
          if (data.turn !== myUid) {
            return { ok: false, reason: 'not_your_turn' };
          }

          // Kelime sözlükte var mı
          if (!isValidTurkishWord(word)) {
            return { ok: false, reason: 'not_a_word' };
          }

          // Daha önce kullanılmış mı
          if (data.usedWords.includes(word)) {
            return { ok: false, reason: 'already_used' };
          }

          // Zincir kuralı: önceki kelimenin son harfiyle başlamalı (ilk kelime hariç)
          if (data.currentWord) {
            const lastLetter = data.currentWord.slice(-1);
            if (word[0] !== lastLetter) {
              return { ok: false, reason: 'invalid_chain' };
            }
          }

          // Her şey uygun -> hamleyi işle, sırayı rakibe devret
          const opponentUid = Object.keys(data.players).find((uid) => uid !== myUid)!;

          transaction.update(matchRef, {
            currentWord: word,
            usedWords: firestore.FieldValue.arrayUnion(word),
            turn: opponentUid,
            turnStartedAt: firestore.FieldValue.serverTimestamp(),
            [`players.${myUid}.score`]: firestore.FieldValue.increment(100),
          });

          return { ok: true };
        });
      } catch (error) {
        console.error('Hamle gönderilirken hata:', error);
        return { ok: false, reason: 'unknown' };
      }
    },
    [matchId, myUid]
  );

  return {
    match,
    loading,
    remainingSeconds,
    submitWord,
    isMyTurn: match?.turn === myUid,
    myPlayer: match?.players?.[myUid],
    opponentPlayer: match ? Object.entries(match.players).find(([uid]) => uid !== myUid)?.[1] : undefined,
  };
}