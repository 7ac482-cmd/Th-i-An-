import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
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
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ADMIN_EMAIL } from '../data/seedData';
import {
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
} from '../firebase';
import type {
  AdminNotification,
  CharacterItem,
  CommentItem,
  MusicTrack,
  UserSession,
} from '../types';
import { audioEngine } from '../utils/audioEngine';

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

const CHUNK_BINARY_SIZE = 450 * 1024; // 460,800 bytes -> ~614,400 chars base64 (< 700,000 limit)

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const sliceSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += sliceSize) {
    const sub = bytes.subarray(i, i + sliceSize);
    binary += String.fromCharCode(...sub);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deleteTrackChunks(trackId: string) {
  const chunksSnap = await getDocs(collection(db, 'tracks', trackId, 'chunks'));
  if (chunksSnap.empty) return;
  for (let i = 0; i < chunksSnap.docs.length; i += 400) {
    const batch = writeBatch(db);
    chunksSnap.docs.slice(i, i + 400).forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  }
}

export function useAppStore() {
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [charsLoading, setCharsLoading] = useState(true);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(true);
  const [likes, setLikes] = useState<Record<string, string[]>>({});
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [latestToast, setLatestToast] = useState<AdminNotification | null>(null);
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

  const initialNotifLoadRef = useRef(true);
  const seenNotifIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      localStorage.setItem(SFX_STORAGE_KEY, JSON.stringify(sfxEnabled));
    } catch {
      // ignore storage quota errors
    }
  }, [sfxEnabled]);

  // Complete pending redirect sign-in if fallback was used
  useEffect(() => {
    getRedirectResult(auth).catch((error) => {
      console.warn('Redirect sign-in check:', error);
    });
  }, []);

  // Sync Firebase Auth state & user profile document
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        setUser(null);
        setNotifications([]);
        setLatestToast(null);
        initialNotifLoadRef.current = true;
        seenNotifIdsRef.current.clear();
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

  // Listen to Characters in Firestore
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

  // Listen to Tracks in Firestore
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

  // Listen to Admin Notifications in real time (only when signed in as Admin)
  useEffect(() => {
    if (!user?.isAdmin) {
      setNotifications([]);
      return;
    }

    initialNotifLoadRef.current = true;
    seenNotifIdsRef.current.clear();

    const unsub = onSnapshot(
      collection(db, 'notifications'),
      (snapshot) => {
        const list: AdminNotification[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id || d.id),
            type: data.type === 'comment' ? 'comment' : 'like',
            characterId: String(data.characterId || ''),
            characterName: String(data.characterName || 'Nhân vật'),
            actorId: String(data.actorId || ''),
            actorName: String(data.actorName || 'Người xem'),
            message: String(data.message || ''),
            read: Boolean(data.read),
            createdAt: toMillis(data.createdAt),
          };
        });
        list.sort((a, b) => b.createdAt - a.createdAt);
        setNotifications(list);

        if (initialNotifLoadRef.current) {
          list.forEach((n) => seenNotifIdsRef.current.add(n.id));
          initialNotifLoadRef.current = false;
        } else {
          const newestUnread = list.find(
            (n) => !n.read && !seenNotifIdsRef.current.has(n.id)
          );
          list.forEach((n) => seenNotifIdsRef.current.add(n.id));
          if (newestUnread) {
            setLatestToast(newestUnread);
            audioEngine.playNotification();
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      }
    );

    return () => unsub();
  }, [user?.isAdmin]);

  const signInWithGoogle = useCallback(async () => {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  }, []);

  const signInWithGoogleRedirect = useCallback(async () => {
    await signInWithRedirect(auth, googleProvider);
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
      const charName = (
        characters.find((c) => c.id === characterId)?.name || characterId
      ).slice(0, 120);

      try {
        if (exists) {
          await deleteDoc(likeRef);
        } else {
          const notifId = sanitizeId(
            `ntf-like-${characterId}-${user.id}-${Date.now().toString(36)}`
          );
          const batch = writeBatch(db);
          batch.set(likeRef, {
            userId: user.id,
            createdAt: serverTimestamp(),
          });
          batch.set(doc(db, 'notifications', notifId), {
            id: notifId,
            type: 'like',
            characterId,
            characterName: charName,
            actorId: user.id,
            actorName: user.name.slice(0, 100),
            message: 'đã thả tim',
            read: false,
            createdAt: serverTimestamp(),
          });
          await batch.commit();
        }
        return true;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, likePath);
      }
    },
    [user, likes, characters]
  );

  const addComment = useCallback(
    async (characterId: string, content: string) => {
      if (!user || !content.trim()) return null;
      const cleanContent = content.trim().slice(0, 1000);
      const commentId = sanitizeId(
        `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      );
      const notifId = sanitizeId(
        `ntf-cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      );
      const commentPath = `characters/${characterId}/comments/${commentId}`;
      const charName = (
        characters.find((c) => c.id === characterId)?.name || characterId
      ).slice(0, 120);

      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'characters', characterId, 'comments', commentId), {
          characterId,
          userId: user.id,
          userName: user.name.slice(0, 100),
          content: cleanContent,
          createdAt: serverTimestamp(),
        });
        batch.set(doc(db, 'notifications', notifId), {
          id: notifId,
          type: 'comment',
          characterId,
          characterName: charName,
          actorId: user.id,
          actorName: user.name.slice(0, 100),
          message: cleanContent,
          read: false,
          createdAt: serverTimestamp(),
        });
        await batch.commit();
        return commentId;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, commentPath);
      }
    },
    [user, characters]
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

  const markNotificationRead = useCallback(
    async (notificationId: string) => {
      if (!user?.isAdmin) return;
      const path = `notifications/${notificationId}`;
      try {
        await updateDoc(doc(db, 'notifications', notificationId), {
          read: true,
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    [user]
  );

  const markAllNotificationsRead = useCallback(async () => {
    if (!user?.isAdmin) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  }, [user, notifications]);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!user?.isAdmin) return;
      const path = `notifications/${notificationId}`;
      try {
        await deleteDoc(doc(db, 'notifications', notificationId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    },
    [user]
  );

  const dismissToast = useCallback(() => {
    setLatestToast(null);
  }, []);

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

  // Admin CRUD: Music Tracks (supports web links & unlimited-size local audio files via chunking)
  const upsertTrack = useCallback(
    async (
      track: MusicTrack,
      audioFile?: File | null,
      onProgress?: (percent: number) => void
    ) => {
      if (!user?.isAdmin) return false;
      const trackId = sanitizeId(track.id);
      const trackRef = doc(db, 'tracks', trackId);
      const trackPath = `tracks/${trackId}`;

      try {
        const existingSnap = await getDoc(trackRef);
        let finalSource = track.source.trim();

        if (audioFile) {
          const mime = audioFile.type || 'audio/mpeg';
          // Clean up any previous chunks when replacing audio file
          await deleteTrackChunks(trackId);

          if (audioFile.size <= 350 * 1024) {
            const buf = await audioFile.arrayBuffer();
            finalSource = `data:${mime};base64,${arrayBufferToBase64(buf)}`;
            onProgress?.(100);
          } else {
            const totalChunks = Math.ceil(audioFile.size / CHUNK_BINARY_SIZE);
            finalSource = `chunked://${trackId}?mime=${encodeURIComponent(mime)}&chunks=${totalChunks}`;

            const parentPayload = {
              title: track.title.trim().slice(0, 120),
              artist: track.artist.trim().slice(0, 120),
              sourceType: 'url' as const,
              source: finalSource.slice(0, 500000),
              durationLabel: track.durationLabel.trim().slice(0, 40),
              updatedAt: serverTimestamp(),
            };

            if (existingSnap.exists()) {
              await updateDoc(trackRef, parentPayload);
            } else {
              await setDoc(trackRef, {
                id: trackId,
                ...parentPayload,
                createdAt: serverTimestamp(),
              });
            }

            // Upload chunks in batches of 4 (~1.8MB per batch) for smooth progress & reliability
            const BATCH_CHUNK_COUNT = 4;
            for (let startIdx = 0; startIdx < totalChunks; startIdx += BATCH_CHUNK_COUNT) {
              const batch = writeBatch(db);
              const endIdx = Math.min(totalChunks, startIdx + BATCH_CHUNK_COUNT);
              for (let idx = startIdx; idx < endIdx; idx += 1) {
                const startByte = idx * CHUNK_BINARY_SIZE;
                const endByte = Math.min(audioFile.size, startByte + CHUNK_BINARY_SIZE);
                const sliceBuf = await audioFile.slice(startByte, endByte).arrayBuffer();
                const b64 = arrayBufferToBase64(sliceBuf);
                const chunkId = `chunk-${String(idx).padStart(4, '0')}`;
                batch.set(doc(db, 'tracks', trackId, 'chunks', chunkId), {
                  trackId,
                  index: idx,
                  data: b64,
                  createdAt: serverTimestamp(),
                });
              }
              await batch.commit();
              onProgress?.(Math.round((endIdx / totalChunks) * 100));
            }
            return true;
          }
        } else if (
          existingSnap.exists() &&
          String(existingSnap.data().source || '').startsWith('chunked://') &&
          !finalSource.startsWith('chunked://')
        ) {
          await deleteTrackChunks(trackId);
        }

        const payload = {
          title: track.title.trim().slice(0, 120),
          artist: track.artist.trim().slice(0, 120),
          sourceType: track.sourceType,
          source: finalSource.slice(0, 500000),
          durationLabel: track.durationLabel.trim().slice(0, 40),
          updatedAt: serverTimestamp(),
        };

        if (existingSnap.exists()) {
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
        await deleteTrackChunks(id);
        await deleteDoc(doc(db, 'tracks', id));
        return true;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, trackPath);
      }
    },
    [user]
  );

  const resolveChunkedAudio = useCallback(async (source: string): Promise<string> => {
    const withoutScheme = source.slice('chunked://'.length);
    const [rawTrackId, queryString = ''] = withoutScheme.split('?');
    const trackId = sanitizeId(rawTrackId);
    const params = new URLSearchParams(queryString);
    const mime = params.get('mime') || 'audio/mpeg';

    const chunksSnap = await getDocs(collection(db, 'tracks', trackId, 'chunks'));
    if (chunksSnap.empty) {
      throw new Error('Không tìm thấy dữ liệu âm thanh cho bài nhạc này.');
    }
    const sorted = [...chunksSnap.docs].sort(
      (a, b) => Number(a.data().index || 0) - Number(b.data().index || 0)
    );
    const arrays = sorted.map((d) => base64ToUint8Array(String(d.data().data || '')));
    const blob = new Blob(arrays, { type: mime });
    return URL.createObjectURL(blob);
  }, []);

  return {
    characters,
    charsLoading,
    tracks,
    tracksLoading,
    likes,
    comments,
    notifications,
    latestToast,
    user,
    authReady,
    sfxEnabled,
    setSfxEnabled,
    signInWithGoogle,
    signInWithGoogleRedirect,
    signOut,
    toggleLike,
    addComment,
    deleteComment,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    dismissToast,
    upsertCharacter,
    deleteCharacter,
    upsertTrack,
    deleteTrack,
    resolveChunkedAudio,
  };
}
