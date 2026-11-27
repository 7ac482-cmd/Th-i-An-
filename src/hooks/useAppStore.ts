import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  Timestamp,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { ADMIN_EMAIL } from '../data/seedData';
import {
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
} from '../firebase';
import type {
  CharacterItem,
  CommentItem,
  MusicTrack,
  UserSession,
} from '../types';

const SFX_STORAGE_KEY = 'cangodoc_sfx_v1';

function toMillis(val: unknown): number {
  if (val instanceof Timestamp) return val.toMillis();
  if (typeof val === 'number') return val;
  return Date.now();
}

function sanitizeId(raw: string): string {
  const clean = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  return clean || `id-${Date.now()}`;
}

export function useAppStore() {
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [charsLoading, setCharsLoading] = useState(true);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(true);
  const [likes, setLikes] = useState<Record<string, string[]>>({});
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [user, setUser] = useState<UserSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(SFX_STORAGE_KEY);
      return raw ? JSON.parse(raw) === true : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SFX_STORAGE_KEY, JSON.stringify(sfxEnabled));
    } catch {
      // ignore storage quota errors
    }
  }, [sfxEnabled]);

  // Sync Firebase Auth state & user profile document
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        setUser(null);
        setAuthReady(true);
        return;
      }

      const email = (fbUser.email || '').toLowerCase();
      const displayName = (fbUser.displayName || email.split('@')[0] || 'Thành viên').slice(0, 100);
      const photoURL = (fbUser.photoURL || '').slice(0, 1000);
      let isAdmin = Boolean(fbUser.emailVerified && email === ADMIN_EMAIL.toLowerCase());

      if (!isAdmin) {
        try {
          const adminSnap = await getDoc(doc(db, 'admins', fbUser.uid));
          isAdmin = adminSnap.exists();
        } catch {
          isAdmin = false;
        }
      }

      const session: UserSession = {
        id: fbUser.uid,
        name: displayName,
        email,
        photoURL,
        isAdmin,
      };
      setUser(session);
      setAuthReady(true);

      if (fbUser.emailVerified && email) {
        try {
          await setDoc(
            doc(db, 'users', fbUser.uid),
            {
              uid: fbUser.uid,
              displayName,
              email,
              photoURL,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${fbUser.uid}`);
        }
      }
    });

    return () => unsub();
  }, []);

  // Listen to Characters in Firestore (real-time, no phantom fallback when empty)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'characters'),
      (snapshot) => {
        const list: CharacterItem[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id || d.id),
            name: String(data.name || ''),
            avatar: String(data.avatar || ''),
            hashtags: Array.isArray(data.hashtags) ? data.hashtags.map(String) : [],
            slogan: String(data.slogan || ''),
            lore: String(data.lore || ''),
            links: Array.isArray(data.links)
              ? data.links.map((l: { label?: unknown; url?: unknown }) => ({
                  label: String(l?.label || 'Liên kết'),
                  url: String(l?.url || ''),
                }))
              : [],
            createdAt: toMillis(data.createdAt),
          };
        });
        list.sort((a, b) => b.createdAt - a.createdAt);
        setCharacters(list);
        setCharsLoading(false);
      },
      (error) => {
        setCharsLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'characters');
      }
    );
    return () => unsub();
  }, []);

  // Listen to Tracks in Firestore (real-time, no phantom fallback when empty)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'tracks'),
      (snapshot) => {
        const list: MusicTrack[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id || d.id),
            title: String(data.title || ''),
            artist: String(data.artist || ''),
            sourceType: data.sourceType === 'preset' ? 'preset' : 'url',
            source: String(data.source || ''),
            durationLabel: String(data.durationLabel || ''),
          };
        });
        setTracks(list);
        setTracksLoading(false);
      },
      (error) => {
        setTracksLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'tracks');
      }
    );
    return () => unsub();
  }, []);

  // Listen to Likes across all characters
  useEffect(() => {
    const unsub = onSnapshot(
      collectionGroup(db, 'likes'),
      (snapshot) => {
        const grouped: Record<string, string[]> = {};
        snapshot.docs.forEach((d) => {
          const charId = d.ref.parent.parent?.id;
          const uid = String(d.data().userId || d.id);
          if (!charId) return;
          if (!grouped[charId]) grouped[charId] = [];
          grouped[charId].push(uid);
        });
        setLikes(grouped);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'likes');
      }
    );
    return () => unsub();
  }, []);

  // Listen to Comments across all characters
  useEffect(() => {
    const unsub = onSnapshot(
      collectionGroup(db, 'comments'),
      (snapshot) => {
        const list: CommentItem[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            characterId: String(data.characterId || d.ref.parent.parent?.id || ''),
            userId: String(data.userId || ''),
            userName: String(data.userName || 'Thành viên'),
            content: String(data.content || ''),
            createdAt: toMillis(data.createdAt),
          };
        });
        list.sort((a, b) => b.createdAt - a.createdAt);
        setComments(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'comments');
      }
    );
    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const toggleLike = useCallback(
    async (characterId: string) => {
      if (!user) return false;
      const likePath = `characters/${characterId}/likes/${user.id}`;
      const likeRef = doc(db, 'characters', characterId, 'likes', user.id);
      const current = likes[characterId] || [];
      const exists = current.includes(user.id);

      try {
        if (exists) {
          await deleteDoc(likeRef);
        } else {
          await setDoc(likeRef, {
            userId: user.id,
            createdAt: serverTimestamp(),
          });
        }
        return true;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, likePath);
      }
    },
    [user, likes]
  );

  const addComment = useCallback(
    async (characterId: string, content: string) => {
      if (!user || !content.trim()) return null;
      const commentId = sanitizeId(`cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
      const commentPath = `characters/${characterId}/comments/${commentId}`;
      try {
        await setDoc(doc(db, 'characters', characterId, 'comments', commentId), {
          characterId,
          userId: user.id,
          userName: user.name.slice(0, 100),
          content: content.trim().slice(0, 1000),
          createdAt: serverTimestamp(),
        });
        return commentId;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, commentPath);
      }
    },
    [user]
  );

  const deleteComment = useCallback(
    async (characterId: string, commentId: string) => {
      if (!user) return;
      const commentPath = `characters/${characterId}/comments/${commentId}`;
      try {
        await deleteDoc(doc(db, 'characters', characterId, 'comments', commentId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, commentPath);
      }
    },
    [user]
  );

  // Admin CRUD: Characters
  const upsertCharacter = useCallback(
    async (charData: Omit<CharacterItem, 'createdAt'> & { createdAt?: number }) => {
      if (!user?.isAdmin) return false;
      const charId = sanitizeId(charData.id);
      const charRef = doc(db, 'characters', charId);
      const charPath = `characters/${charId}`;

      const payload = {
        name: charData.name.trim().slice(0, 120),
        avatar: charData.avatar.trim().slice(0, 300000),
        hashtags: charData.hashtags.slice(0, 15).map((t) => String(t).slice(0, 60)),
        slogan: charData.slogan.trim().slice(0, 300),
        lore: charData.lore.trim().slice(0, 20000),
        links: charData.links.slice(0, 10).map((l) => ({
          label: String(l.label || 'Liên kết').slice(0, 100),
          url: String(l.url || '').slice(0, 500),
        })),
        updatedAt: serverTimestamp(),
      };

      try {
        const snap = await getDoc(charRef);
        if (snap.exists()) {
          await updateDoc(charRef, payload);
        } else {
          await setDoc(charRef, {
            id: charId,
            ...payload,
            createdAt: serverTimestamp(),
          });
        }
        return true;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, charPath);
      }
    },
    [user]
  );

  const deleteCharacter = useCallback(
    async (id: string) => {
      if (!user?.isAdmin) return false;
      const charPath = `characters/${id}`;
      try {
        await deleteDoc(doc(db, 'characters', id));
        return true;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, charPath);
      }
    },
    [user]
  );

  // Admin CRUD: Music Tracks
  const upsertTrack = useCallback(
    async (track: MusicTrack) => {
      if (!user?.isAdmin) return false;
      const trackId = sanitizeId(track.id);
      const trackRef = doc(db, 'tracks', trackId);
      const trackPath = `tracks/${trackId}`;

      const payload = {
        title: track.title.trim().slice(0, 120),
        artist: track.artist.trim().slice(0, 120),
        sourceType: track.sourceType,
        source: track.source.trim().slice(0, 500000),
        durationLabel: track.durationLabel.trim().slice(0, 40),
        updatedAt: serverTimestamp(),
      };

      try {
        const snap = await getDoc(trackRef);
        if (snap.exists()) {
          await updateDoc(trackRef, payload);
        } else {
          await setDoc(trackRef, {
            id: trackId,
            ...payload,
            createdAt: serverTimestamp(),
          });
        }
        return true;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, trackPath);
      }
    },
    [user]
  );

  const deleteTrack = useCallback(
    async (id: string) => {
      if (!user?.isAdmin) return false;
      const trackPath = `tracks/${id}`;
      try {
        await deleteDoc(doc(db, 'tracks', id));
        return true;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, trackPath);
      }
    },
    [user]
  );

  return {
    characters,
    charsLoading,
    tracks,
    tracksLoading,
    likes,
    comments,
    user,
    authReady,
    sfxEnabled,
    setSfxEnabled,
    signInWithGoogle,
    signOut,
    toggleLike,
    addComment,
    deleteComment,
    upsertCharacter,
    deleteCharacter,
    upsertTrack,
    deleteTrack,
  };
}
