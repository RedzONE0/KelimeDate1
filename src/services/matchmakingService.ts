// src/services/matchmakingService.ts
import firestore from '@react-native-firebase/firestore';
import { db } from './firebaseConfig';
import { getRandomChainWord } from '../utils/wordValidator';

const QUEUE_COLLECTION = 'wordChainQueue';
const MATCHES_COLLECTION = 'wordChainMatches';

export type MatchmakingResult = {
  matchId: string;
  opponentUid: string;
  opponentName: string;
  isHost: boolean; // ilk kelimeyi kim seçecek / sırayı kim başlatacak bilgisi için faydalı olabilir
};

// Bekleme durumundaki bir eşleşmeyi dinlemek için kullanılacak callback tipi
type OnMatchedCallback = (result: MatchmakingResult) => void;

/**
 * Kuyruğa katılır. Eğer bekleyen uygun bir rakip varsa anında eşleştirir
 * ve matchId döner. Yoksa kuyrukta bekleme moduna geçer, `onMatched`
 * callback'i ile daha sonra eşleşme bilgisini iletir.
 *
 * Dönen fonksiyon: dinlemeyi/kuyruğu iptal etmek için "cleanup" fonksiyonu.
 */
export async function joinMatchmakingQueue(
  currentUid: string,
  currentDisplayName: string,
  onMatched: OnMatchedCallback,
  onError: (error: unknown) => void
): Promise<() => Promise<void>> {
  const queueRef = db.collection(QUEUE_COLLECTION);
  const myQueueDocRef = queueRef.doc(currentUid);

  try {
    // 1. Bekleyen (henüz eşleşmemiş) başka bir oyuncu var mı bak.
    //    Kendi uid'imizi hariç tutuyoruz, en eski bekleyeni alıyoruz (adil sıra için).
    const waitingSnapshot = await queueRef
      .where('status', '==', 'waiting')
      .orderBy('queuedAt', 'asc')
      .limit(5) // kendi dokümanımız da bu 5 içinde olabilir, aşağıda filtreliyoruz
      .get();

    const opponentDoc = waitingSnapshot.docs.find((doc) => doc.id !== currentUid);

    if (opponentDoc) {
      // 2. Rakip bulundu -> transaction ile güvenli şekilde eşleştir
      const opponentUid = opponentDoc.id;
      const opponentData = opponentDoc.data();

      const matchId = await runMatchTransaction(currentUid, currentDisplayName, opponentUid, opponentData.displayName);

      onMatched({
        matchId,
        opponentUid,
        opponentName: opponentData.displayName ?? 'Rakip',
        isHost: true, // eşleşmeyi biz tetikledik, ilk hamle ayarını biz belirleyeceğiz
      });

      return async () => {}; // eşleşme anında oldu, temizlenecek bir dinleyici yok
    }

    // 3. Kimse yok -> kendimizi kuyruğa ekleyip bekleme moduna geçiyoruz
    await myQueueDocRef.set({
      uid: currentUid,
      displayName: currentDisplayName,
      status: 'waiting',
      queuedAt: firestore.FieldValue.serverTimestamp(),
      matchedMatchId: null,
      matchedOpponentUid: null,
      matchedOpponentName: null,
    });

    // 4. Kendi kuyruk dokümanımızı dinliyoruz. Biri bizi eşleştirdiğinde
    //    matchedMatchId alanı dolacak.
    const unsubscribe = myQueueDocRef.onSnapshot(
      (docSnap) => {
        const data = docSnap.data();
        if (data?.matchedMatchId) {
          onMatched({
            matchId: data.matchedMatchId,
            opponentUid: data.matchedOpponentUid,
            opponentName: data.matchedOpponentName ?? 'Rakip',
            isHost: false, // bizi başkası eşleştirdi, ilk hamle ayarı karşı taraftan geldi
          });
          unsubscribe();
        }
      },
      (error) => onError(error)
    );

    // cleanup fonksiyonu: ekrandan çıkılırsa kuyruktan silinip dinleyici kapatılsın
    return async () => {
      unsubscribe();
      await myQueueDocRef.delete().catch(() => {});
    };
  } catch (error) {
    onError(error);
    return async () => {};
  }
}

/**
 * İki oyuncuyu eşleştiren transaction: kuyruktan rakibi siler, kendi
 * kuyruk kaydımızı da temizler, ortak bir match dokümanı oluşturur.
 */
async function runMatchTransaction(
  myUid: string,
  myDisplayName: string,
  opponentUid: string,
  opponentDisplayName: string
): Promise<string> {
  const matchRef = db.collection(MATCHES_COLLECTION).doc(); // otomatik id
  const opponentQueueRef = db.collection(QUEUE_COLLECTION).doc(opponentUid);
  const myQueueRef = db.collection(QUEUE_COLLECTION).doc(myUid);

  await db.runTransaction(async (transaction) => {
    const opponentSnap = await transaction.get(opponentQueueRef);

    // Rakip başka biri tarafından az önce alınmış olabilir (race condition) -> kontrol et
    // Not: react-native-firebase v25'te `exists` bir metottur, property değil.
    if (!opponentSnap.exists() || opponentSnap.data()?.status !== 'waiting') {
      throw new Error('Rakip artık uygun değil, tekrar deneniyor.');
    }

    // Rakibin kuyruk kaydını güncelle: eşleşme bilgisini ona bildir
    transaction.update(opponentQueueRef, {
      status: 'matched',
      matchedMatchId: matchRef.id,
      matchedOpponentUid: myUid,
      matchedOpponentName: myDisplayName,
    });

    // Eşleşmeyi biz tetiklediğimiz için kuyrukta beklemiyorduk; yine de
    // olası bir artık kaydı temizleyelim (öksüz doküman bırakmamak için).
    transaction.delete(myQueueRef);

    // Ortak match dokümanını oluştur
    transaction.set(matchRef, {
     players: {
    [myUid]: { displayName: myDisplayName, score: 0, alive: true },
    [opponentUid]: { displayName: opponentDisplayName, score: 0, alive: true },
    },
     status: 'active',
     usedWords: [],
     currentWord: getRandomChainWord(),
     turn: myUid,
     turnStartedAt: firestore.FieldValue.serverTimestamp(),
     turnDuration: 10,
     createdAt: firestore.FieldValue.serverTimestamp(),
     winnerUid: null,
   });
  });

  return matchRef.id;
}

/**
 * Kullanıcı eşleşme ekranından çıkarsa / vazgeçerse kuyruktan temizlik.
 */
export async function leaveMatchmakingQueue(uid: string): Promise<void> {
  await db.collection(QUEUE_COLLECTION).doc(uid).delete().catch(() => {});
}