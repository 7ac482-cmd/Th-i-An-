export interface CharacterLink {
  label: string;
  url: string;
}

export interface CharacterItem {
  id: string;
  name: string;
  avatar: string;
  hashtags: string[];
  slogan: string;
  lore: string;
  links: CharacterLink[];
  createdAt: number;
}

export type MusicSourceType = 'preset' | 'url';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  sourceType: MusicSourceType;
  source: string;
  durationLabel: string;
}

export interface CommentItem {
  id: string;
  characterId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: number;
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  isAdmin: boolean;
}

export type AppView = 'intro' | 'gallery' | 'detail' | 'music' | 'admin';
