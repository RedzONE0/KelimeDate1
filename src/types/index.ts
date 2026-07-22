export type Gender = 'erkek' | 'kadın' | 'belirtmek_istemiyorum';

export interface Avatar {
  id: string;
  name: string;
  accentColor: string;
  imageSource: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
  avatarId: string;
  heightCm: number | null;
  weightKg: number | null;
  gender: Gender | null;
  hobbies: string[];
  musicGenres: string[];
  totalScore: number;
  gamesPlayed: number;
  gamesWon: number;
  isOnline: boolean;
  // --- 🛡️ GÜVENLİK/HUZUR MODÜLÜ ---
  blockedUsers: string[]; // Engellenen kullanıcıların UID listesini tutar
}

export interface User extends UserProfile {}

export type GameMode = 'kelime_tahmini' | 'kelime_zinciri' | 'birlikte_bulalim';

export type MatchResult = 'win' | 'lose' | 'draw';

export interface GameMatch {
  id: string;
  createdAt: string;
  gameMode: GameMode;
  winnerUid: string | null;
  loserUid: string | null;
  winnerName: string;
  loserName: string;
  winnerScore: number;
  loserScore: number;
  earnedPoints: number;
  result: MatchResult;
  durationSeconds: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderUid: string;
  senderName: string;
  senderAvatarId?: string; // Mesajın yanında fütüristik resmi göstermek için
  text: string;
  createdAt: string;
  isSystemMessage: boolean;
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  isActive: boolean;
  memberCount: number;
  // --- Yeni Eklenen Sosyal Özellikler ---
  isGroup: boolean; // true ise topluluk odası, false ise birebir DM
  participants: string[]; // Bu odadaki kullanıcıların UID listesi (Birebirde 2 kişi olacak)
  participantNames?: Record<string, string>; // UID -> İsim eşleşmesi (Örn: {"uid123": "Mert"})
  participantAvatars?: Record<string, string>; // UID -> AvatarId eşleşmesi (Örn: {"uid123": "avatar-1"})
  lastMessage?: string;
  lastMessageAt?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isNewUser: boolean;
}

export interface GameState {
  currentMatch: GameMatch | null;
  currentGameMode: GameMode | null;
  score: number;
  isPlaying: boolean;
}