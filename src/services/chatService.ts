// src/services/chatService.ts
import { firebaseAuth as auth, db } from './firebaseConfig';
import { ChatMessage, ChatRoom } from '../types';

const CHAT_ROOMS_COLLECTION = 'chatRooms';

// Girdi temizleme (Sanitize) güvenlik motoru
const sanitizeText = (value: string, maxLength = 180): string => 
  value.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);

const BAD_WORDS = ['abaza','abazan','ag','ağzına sıçayım','ahmak','allah','allahsız','am','amarım','ambiti','am biti','amcığı ','amcığın','amcığını','amcığınızı','amcık','amcıkhoşafı','amcıklama','amcıklandı','amcik','amck','amckl','amcklama','amcklaryla','amckta','amcktan','amcuk','amık','amına','amınako','amına koy','amına koyarım','amına koyayım','amınakoyim','amına koyyim','amına s','amına sikem','amına sokam','amın feryadı','amını','amını s','amın oglu','amınoğlu','amın oğlu','amısına','amısını','amina','amina g','amina k','aminako','aminakoyarim','amina koyarim','amina koyayım','amina koyayim','aminakoyim','aminda','amindan','amindayken','amini','aminiyarraaniskiim','aminoglu','amin oglu','amiyum','amk','amkafa','amk çocuğu','amlarnzn','amlı','amm','ammak','ammna','amn','amna','amnda','amndaki','amngtn','amnn','amona','amq','amsız','amsiz','amsz','amteri','amugaa','amuğa','amuna','ana','anaaann','anal','analarn','anam','anamla','anan','anana','anandan','ananı','ananı ','ananın','ananın am','ananın amı','ananın dölü','ananınki','ananısikerim','ananı sikerim','ananısikeyim','ananı sikeyim','ananızın','ananızın am','anani','ananin','ananisikerim','anani sikerim','ananisikeyim','anani sikeyim','anann','ananz','anas','anasını','anasının am','anası orospu','anasi','anasinin','anay','anayin','angut','anneni','annenin','annesiz','anuna','aptal','aq','a.q','a.q.','aq.','ass','atkafası','atmık','attırdığım','attrrm','auzlu','avrat','ayklarmalrmsikerim','azdım','azdır','azdırıcı','babaannesi kaşar','babanı','babanın','babani','babası pezevenk','bacağına sıçayım','bacına','bacını','bacının','bacini','bacn','bacndan','bacy','bastard','basur','beyinsiz','bızır','bitch','biting','bok','boka','bokbok','bokça','bokhu','bokkkumu','boklar','boktan','boku','bokubokuna','bokum','bombok','boner','bosalmak','boşalmak','cenabet','cibiliyetsiz','cibilliyetini','cibilliyetsiz','cif','cikar','cim','çük','dalaksız','dallama','daltassak','dalyarak','dalyarrak','dangalak','dassagi','diktim','dildo','dingil','dingilini','dinsiz','dkerim','domal','domalan','domaldı','domaldın','domalık','domalıyor','domalmak','domalmış','domalsın','domalt','domaltarak','domaltıp','domaltır','domaltırım','domaltip','domaltmak','dölü','dönek','düdük','eben','ebeni','ebenin','ebeninki','ebleh','ecdadını','ecdadini','embesil','emi','fahise','fahişe','feriştah','ferre','fuck','fucker','fuckin','fucking','gavad','gavat','geber','geberik','gebermek','gebermiş','gebertir','gerızekalı','gerizekalı','gerizekali','gerzek','giberim','giberler','gibis','gibiş','gibmek','gibtiler','goddamn','godoş','godumun','gotelek','gotlalesi','gotlu','gotten','gotundeki','gotunden','gotune','gotunu','gotveren','goyiim','goyum','goyuyim','goyyim','göt','göt deliği','götelek','göt herif','götlalesi','götlek','götoğlanı','göt oğlanı','götoş','götten','götü','götün','götüne','götünekoyim','götüne koyim','götünü','götveren','göt veren','göt verir','gtelek','gtn','gtnde','gtnden','gtne','gtten','gtveren','hasiktir','hassikome','hassiktir','has siktir','hassittir','haysiyetsiz','hayvan herif','hoşafı','hödük','hsktr','huur','ıbnelık','ibina','ibine','ibinenin','ibne','ibnedir','ibneleri','ibnelik','ibnelri','ibneni','ibnenin','ibnerator','ibnesi','idiot','idiyot','imansz','ipne','iserim','işerim','itoğlu it','kafam girsin','kafasız','kafasiz','kahpe','kahpenin','kahpenin feryadı','kaka','kaltak','kancık','kancik','kappe','karhane','kaşar','kavat','kavatn','kaypak','kayyum','kerane','kerhane','kerhanelerde','kevase','kevaşe','kevvase','koca göt','koduğmun','koduğmunun','kodumun','kodumunun','koduumun','koyarm','koyayım','koyiim','koyiiym','koyim','koyum','koyyim','krar','kukudaym','laciye boyadım','lavuk','liboş','madafaka','mal','malafat','malak','manyak','mcik','meme','memelerini','mezveleli','minaamcık','mincikliyim','mna','monakkoluyum','motherfucker','mudik','oc','ocuu','ocuun','OÇ','oç','o. çocuğu','oğlan','oğlancı','oğlu it','orosbucocuu','orospu','orospucocugu','orospu cocugu','orospu çoc','orospuçocuğu','orospu çocuğu','orospu çocuğudur','orospu çocukları','orospudur','orospular','orospunun','orospunun evladı','orospuydu','orospuyuz','orostoban','orostopol','orrospu','oruspu','oruspuçocuğu','oruspu çocuğu','osbir','ossurduum','ossurmak','ossuruk','osur','osurduu','osuruk','osururum','otuzbir','öküz','öşex','patlak zar','penis','pezevek','pezeven','pezeveng','pezevengi','pezevengin evladı','pezevenk','pezo','pic','pici','picler','piç','piçin oğlu','piç kurusu','piçler','pipi','pipiş','pisliktir','porno','pussy','puşt','puşttur','rahminde','revizyonist','s1kerim','s1kerm','s1krm','sakso','saksofon','salaak','salak','saxo','sekis','serefsiz','sevgi koyarım','sevişelim','sexs','sıçarım','sıçtığım','sıecem','sicarsin','sie','sik','sikdi','sikdiğim','sike','sikecem','sikem','siken','sikenin','siker','sikerim','sikerler','sikersin','sikertir','sikertmek','sikesen','sikesicenin','sikey','sikeydim','sikeyim','sikeym','siki','sikicem','sikici','sikien','sikienler','sikiiim','sikiiimmm','sikiim','sikiir','sikiirken','sikik','sikil','sikildiini','sikilesice','sikilmi','sikilmie','sikilmis','sikilmiş','sikilsin','sikim','sikimde','sikimden','sikime','sikimi','sikimiin','sikimin','sikimle','sikimsonik','sikimtrak','sikin','sikinde','sikinden','sikine','sikini','sikip','sikis','sikisek','sikisen','sikish','sikismis','sikiş','sikişen','sikişme','sikitiin','sikiyim','sikiym','sikiyorum','sikkim','sikko','sikleri','sikleriii','sikli','sikm','sikmek','sikmem','sikmiler','sikmisligim','siksem','sikseydin','sikseyidin','siksin','siksinbaya','siksinler','siksiz','siksok','siksz','sikt','sikti','siktigimin','siktigiminin','siktiğim','siktiğimin','siktiğiminin','siktii','siktiim','siktiimin','siktiiminin','siktiler','siktim','siktim ','siktimin','siktiminin','siktir','siktir et','siktirgit','siktir git','siktirir','siktiririm','siktiriyor','siktir lan','siktirolgit','siktir ol git','sittimin','sittir','skcem','skecem','skem','sker','skerim','skerm','skeyim','skiim','skik','skim','skime','skmek','sksin','sksn','sksz','sktiimin','sktrr','skyim','slaleni','sokam','sokarım','sokarim','sokarm','sokarmkoduumun','sokayım','sokaym','sokiim','soktuğumunun','sokuk','sokum','sokuş','sokuyum','soxum','sulaleni','sülaleni','sülalenizi','sürtük','şerefsiz','şıllık','taaklarn','taaklarna','tarrakimin','tasak','tassak','taşak','taşşak','tipini s.k','tipinizi s.keyim','tiyniyat','toplarm','topsun','totoş','vajina','vajinanı','veled','veledizina','veled i zina','verdiimin','weled','weledizina','whore','xikeyim','yaaraaa','yalama','yalarım','yalarun','yaraaam','yarak','yaraksız','yaraktr','yaram','yaraminbasi','yaramn','yararmorospunun','yarra','yarraaaa','yarraak','yarraam','yarraamı','yarragi','yarragimi','yarragina','yarragindan','yarragm','yarrağ','yarrağım','yarrağımı','yarraimin','yarrak','yarram','yarramin','yarraminbaşı','yarramn','yarran','yarrana','yarrrak','yavak','yavş','yavşak','yavşaktır','yavuşak','yılışık','yilisik','yogurtlayam','yoğurtlayam','yrrak','zıkkımım','zibidi','zigsin','zikeyim','zikiiim','zikiim','zikik','zikim','ziksiiin','ziksiin','zulliyetini','zviyetini']

// Regex özel karakterlerini kaçır (kelimeler kullanıcı listesinden geliyor)
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
 
// 🎯 PERFORMANS: Tüm kötü kelimeler için TEK bir regex'i modül yüklenirken bir kez derliyoruz.
// Eskiden her mesajda ~700 adet RegExp yeniden derleniyordu.
// Uzun kelimeler önce gelsin ki alternasyon en uzun eşleşmeyi yakalasın.
const BAD_WORDS_REGEX = new RegExp(
  '(' + [...BAD_WORDS].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|') + ')',
  'gi'
);
 
// Türkçe harf sınır kontrolü — "bayram" içindeki "am" gibi masum eşleşmeleri elemek için.
const LETTER_RE = /[a-zA-ZçÇğĞıİöÖşŞüÜâîûÂÎÛ]/;
 
/**
 * Mesaj içindeki kötü kelimeleri yakalayıp yıldızlayan (***) filtre fonksiyonu.
 * Kelime sınırı kontrolü sayesinde masum kelimelerin içindeki alt dizeler sansürlenmez.
 */
export const filterBadWords = (text: string): string => {
  return text.replace(BAD_WORDS_REGEX, (match: string, _group: string, offset: number, full: string) => {
    const before = full[offset - 1];
    const after = full[offset + match.length];
    if (LETTER_RE.test(before ?? '') || LETTER_RE.test(after ?? '')) {
      return match; // harfle çevrili -> gerçek bir kelimenin parçası, dokunma
    }
    return '***';
  });
};
 
export interface SendMessagePayload {
  chatId: string;
  senderUid: string;
  senderName: string;
  text: string;
  avatarId: string; // Fütüristik avatarı basmak için can damarı
}
 
/**
 * 🎯 Yeni bir Grup/Topluluk odası oluşturur (Lobi vb.)
 */
export const createChatRoom = async (roomName: string, description: string): Promise<string> => {
  const activeUid = auth.currentUser?.uid;
  if (!activeUid) throw new Error('Yetkilendirme hatası.');
 
  const safeName = sanitizeText(roomName, 40) || 'Genel Sohbet';
  const safeDescription = sanitizeText(description, 160);
 
  const roomRef = await db.collection(CHAT_ROOMS_COLLECTION).add({
    ownerUid: activeUid,
    name: safeName,
    description: safeDescription,
    createdAt: new Date().toISOString(),
    isActive: true,
    memberCount: 1,
    isGroup: true, // Grup odası olduğunu mühürlüyoruz
    participants: [activeUid],
    lastMessage: 'Oda oluşturuldu!',
    lastMessageAt: new Date().toISOString(),
  });
 
  return roomRef.id;
};
 
/**
 * 🎯 İki oyuncu arasında Birebir Özel Mesajlaşma (DM) Odası Başlatır
 */
export const createPrivateChatRoom = async (partnerUid: string, partnerName: string, partnerAvatarId: string): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser?.uid) throw new Error('Yetkilendirme hatası.');
 
  // Çakışmayı önlemek için iki benzersiz UID'yi alfabetik sıralayıp özel bir oda ID'si üretiyoruz
  const roomId = currentUser.uid < partnerUid 
    ? `dm_${currentUser.uid}_${partnerUid}` 
    : `dm_${partnerUid}_${currentUser.uid}`;
 
  const roomRef = db.collection(CHAT_ROOMS_COLLECTION).doc(roomId);
  const roomSnap = await roomRef.get();
 
  // Oda daha önce kurulmadıysa sıfırdan kuruyoruz
  if (!roomSnap.exists()) {
    await roomRef.set({
      isGroup: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      participants: [currentUser.uid, partnerUid],
      participantNames: {
        [currentUser.uid]: currentUser.displayName || 'Oyuncu',
        [partnerUid]: partnerName
      },
      participantAvatars: {
        [currentUser.uid]: 'avatar-1',
        [partnerUid]: partnerAvatarId
      },
      lastMessage: 'Sohbet başladı! 👋',
      lastMessageAt: new Date().toISOString()
    });
  }
 
  return roomId;
};
 
/**
 * 🎯 Seçili odanın içindeki mesajları CANLI (real-time) dinler (Subcollection Mimarisi)
 */
export const subscribeToMessages = (chatId: string, callback: (messages: ChatMessage[]) => void): (() => void) => {
  const q = db.collection(CHAT_ROOMS_COLLECTION)
    .doc(chatId)
    .collection('messages')
    .orderBy('createdAt', 'asc')
    .limitToLast(50);

  const unsub = q.onSnapshot(
    (snapshot) => {
      if (!snapshot || !snapshot.docs) {
        callback([]);
        return;
      }

      const messages = snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          chatId: data.chatId ?? chatId,
          senderUid: data.senderUid ?? 'system',
          senderName: sanitizeText(data.senderName ?? 'Sistem', 40),
          senderAvatarId: data.senderAvatarId ?? 'avatar-1',
          text: sanitizeText(data.text ?? '', 500),
          createdAt: data.createdAt ?? new Date().toISOString(),
          isSystemMessage: data.isSystemMessage ?? false,
        } satisfies ChatMessage;
      });

      callback(messages);
    },
    (error) => {
      console.error('subscribeToMessages hata:', error);
      callback([]);
    }
  );

  return unsub;
};
 
/**
 * 🎯 Hile Korumalı Mesaj Gönderme Fonksiyonu
 */
export const sendMessage = async (payload: SendMessagePayload): Promise<void> => {
  const activeUid = auth.currentUser?.uid;
  if (!activeUid || activeUid !== payload.senderUid) {
    throw new Error('Yetkilendirme hatası.');
  }
 
  const safeText = sanitizeText(payload.text, 500);
  const cleanText = filterBadWords(safeText); // 🎯 KÖTÜ KELİME FİLTRESİ DEVREDE!
  const safeName = sanitizeText(payload.senderName, 40);
  const timeStamp = new Date().toISOString();
 
  const roomRef = db.collection(CHAT_ROOMS_COLLECTION).doc(payload.chatId);
  const messageRef = roomRef.collection('messages').doc();
 
  // İki yazımı tek atomik batch içinde yapıyoruz: ya ikisi de olur ya da hiçbiri.
  const batch = db.batch();
 
  // 1. Mesajı odanın altındaki güvenli alt koleksiyona (subcollection) yazıyoruz
  batch.set(messageRef, {
    chatId: payload.chatId,
    senderUid: activeUid,
    senderName: safeName || 'Kullanıcı',
    senderAvatarId: payload.avatarId, // 🎯 DÜZELTME: AvatarID kaydediliyor
    text: cleanText,
    createdAt: timeStamp,
    isSystemMessage: false,
  });
 
  // 2. Ana odayı güncelliyoruz (Lobi listesinde anlık 'Son Mesaj' güncellensin diye)
  // Önizlemede de filtrelenmiş metni gösteriyoruz (eskiden ham metin gidiyordu).
  batch.set(roomRef, {
    lastMessage: `${safeName}: ${cleanText}`,
    lastMessageAt: timeStamp
  }, { merge: true });
 
  await batch.commit();
};

