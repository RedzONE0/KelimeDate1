export type WordEntry = {
  word: string;
  meaning: string;
};

export const POPULAR_WORDS: WordEntry[] = [
  { word: 'yazılım', meaning: 'Bir bilgisayarda işletim, yönetim ve geliştirme işlemlerini gerçekleştiren programlar bütünü.' },
  { word: 'kahve', meaning: 'Özel işlemlerle hazırlanmış, küçük fincanlarda sunulan sıcak içecek.' },
  { word: 'kitap', meaning: 'Yazılı veya basılı bilgilerin bir araya gelerek oluşturduğu eser.' },
  { word: 'romantik', meaning: 'Duygusal ve aşka ilişkin, özel bir atmosfer taşıyan.' },
  { word: 'gece', meaning: 'Güneş battıktan sonra başlayan ve sabaha kadar süren karanlık zaman dilimi.' },
  { word: 'sahil', meaning: 'Deniz ile kara arasında kalan kıyı alanı.' },
  { word: 'müzik', meaning: 'Seslerin ritim, melodi ve armoni oluşturacak şekilde düzenlenmesi.' },
  { word: 'dans', meaning: 'Müziğe uygun olarak yapılan ritmik beden hareketleri.' },
  { word: 'yıldız', meaning: 'Gökyüzünde parlayan, uzayda milyarlarca olan kozmik cisimlerden biri.' },
  { word: 'gülüş', meaning: 'Neşeli veya samimi bir ifade ile yüzün aydınlanması.' },
  { word: 'seyahat', meaning: 'Bir yerden başka bir yere gitme ve yeni yerler keşfetme eylemi.' },
  { word: 'tatil', meaning: 'İş veya okuldan uzaklaşılarak dinlenme ve eğlenme zamanı.' },
  { word: 'lezzet', meaning: 'Yiyecek veya içeceğin damağa verdiği hoş tat.' },
  { word: 'hobiler', meaning: 'Kişinin boş zamanlarında keyif almak için yaptığı etkinlikler.' },
  { word: 'sanat', meaning: 'Yaratıcı düşünce ve estetik duyguyla ortaya konan eserler.' },
  { word: 'mutluluk', meaning: 'İçsel olarak iyi hissetme ve memnuniyet duyma durumu.' },
  { word: 'şiir', meaning: 'Duyguları ve düşünceleri ritmik ya da ölçülü bir dille anlatan eser.' },
  { word: 'aşk', meaning: 'Yoğun sevgi ve bağlılık hissiyle bağlanma durumu.' },
  { word: 'gizem', meaning: 'Anlaşılamayan, sır dolu ve merak uyandıran durum.' },
  { word: 'macera', meaning: 'Heyecan verici, beklenmedik olaylarla dolu serüven.' },
  { word: 'güneş', meaning: 'Gündüzleri dünyaya ışık ve ısı sağlayan yıldız.' },
  { word: 'bahar', meaning: 'Doğa canlandığında, çiçeklerin açtığı mevsim.' },
  { word: 'deniz', meaning: 'Büyük su kütleleri ve kıyıları olan doğal su alanı.' },
  { word: 'dostluk', meaning: 'Samimi ilişkiler ve güvene dayalı arkadaşlık.' },
  { word: 'huzur', meaning: 'Sakinlik, içsel sükunet ve rahatlama durumu.' },
  { word: 'rüya', meaning: 'Uyku sırasında zihinde canlanan görüntüler ve duygular.' },
  { word: 'tutku', meaning: 'Güçlü bir istek, coşku veya aşırı bağlılık duygusu.' },
  { word: 'heves', meaning: 'Bir şeyi yapmaya duyulan geçici veya canlı istek.' },
  { word: 'samimiyet', meaning: 'İçtenlik, dürüstlük ve yapmacıksız olma hali.' },
  { word: 'bakış', meaning: 'Gözlerin bir noktaya veya kişiye odaklanma biçimi.' },
  { word: 'dokunuş', meaning: 'Hafifçe temas etme, hissettirme eylemi.' },
  { word: 'tebessüm', meaning: 'Sessizce ve hafifçe gülümseme hali.' },
  { word: 'zarafet', meaning: 'İncelik, kibarlık ve estetik duruş.' },
  { word: 'cazibe', meaning: 'Çekicilik, etkileyicilik ve albeni.' },
  { word: 'hasret', meaning: 'Özlem duyulan bir kimseye veya yere kavuşma isteği.' },
  { word: 'vefa', meaning: 'Dostlukta, sevgide ve bağlılıkta kararlılık.' },
  { word: 'sadakat', meaning: 'Bağlılık, doğruluk ve içten dostluk.' },
  { word: 'güven', meaning: 'Korku ve şüphe duymadan inanma, dayanma hissi.' },
  { word: 'sohbet', meaning: 'Dostça ve samimi olarak yapılan konuşma.' },
  { word: 'muhabbet', meaning: 'Sevgiye dayalı derin ve tatlı konuşma.' },
  { word: 'birliktelik', meaning: 'Bir arada bulunma ve ortak hareket etme hali.' },
  { word: 'ahenk', meaning: 'Uyumlu seslerin ve görüntülerin meydana getirdiği güzellik.' }
];

export const standardizeWord = (word: string): string => {
  if (!word) return '';
  return word.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
};

const dictionarySet = new Set<string>();

// 1. Popüler kelimeler anında yüklenir
POPULAR_WORDS.forEach((item) => {
  if (item && item.word) {
    dictionarySet.add(standardizeWord(item.word));
  }
});

// 2. Dev sözlük parça parça (chunk) yüklenir, JS thread'i kilitlemez
function loadWordsInChunks(words: string[], chunkSize = 1000) {
  let index = 0;
  function processChunk() {
    const end = Math.min(index + chunkSize, words.length);
    for (let i = index; i < end; i++) {
      const w = words[i];
      if (w && typeof w === 'string') {
        // turkce_kelimeler.ts içindeki kelimeler zaten küçük harfli olduğu için
        // burada toLocaleLowerCase çağırmaya gerek yok, sadece trim yeterli.
        dictionarySet.add(w.trim());
      }
    }
    index = end;
    if (index < words.length) {
      setTimeout(processChunk, 0);
    }
  }
  processChunk();
}

let rawWordsCache: string[] = [];

setTimeout(() => {
  try {
    const WordsModule = require('./turkce_kelimeler');
    const rawList: string[] = WordsModule.RAW_WORDS || WordsModule.default || [];
    if (Array.isArray(rawList)) {
      rawWordsCache = rawList; // diziyi burada saklıyoruz, dışarıdan erişebilmek için
      loadWordsInChunks(rawList);
    }
  } catch (e) {
    console.log('Ekstra sözlük yüklenirken es geçildi.');
  }
}, 300);

/**
 * Kelime zinciri gibi modlar için 72 binlik havuzdan rastgele kelime seçer.
 * Henüz yüklenmediyse (uygulama yeni açıldıysa) POPULAR_WORDS'e düşer.
 */
export const getRandomChainWord = (): string => {
  if (rawWordsCache.length > 0) {
    const index = Math.floor(Math.random() * rawWordsCache.length);
    return rawWordsCache[index];
  }
  const fallbackIndex = Math.floor(Math.random() * POPULAR_WORDS.length);
  return POPULAR_WORDS[fallbackIndex].word;
};

export const isValidTurkishWord = (word: string): boolean => {
  if (!word) return false;
  return dictionarySet.has(standardizeWord(word));
};

export const getRandomGameWord = (): WordEntry => {
  const index = Math.floor(Math.random() * POPULAR_WORDS.length);
  return POPULAR_WORDS[index];
};