import { Heart, MessageSquare, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdminPage } from './components/AdminPage';
import { AuthModal } from './components/AuthModal';
import { CharacterDetailPage } from './components/CharacterDetailPage';
import { GalleryPage } from './components/GalleryPage';
import { IntroScreen } from './components/IntroScreen';
import { MusicBar } from './components/MusicBar';
import { MusicPage } from './components/MusicPage';
import { Navbar } from './components/Navbar';
import { SmokeCanvas } from './components/SmokeCanvas';
import { useAppStore } from './hooks/useAppStore';
import type { AppView, MusicTrack } from './types';
import { audioEngine } from './utils/audioEngine';

function pickRandomTrack(trackList: MusicTrack[], excludeId?: string): MusicTrack | null {
  if (!trackList.length) return null;
  const pool =
    excludeId && trackList.length > 1
      ? trackList.filter((t) => t.id !== excludeId)
      : trackList;
  return pool[Math.floor(Math.random() * pool.length)] || null;
}

export default function App() {
  const {
    characters,
    charsLoading,
    tracks,
    likes,
    comments,
    notifications,
    latestToast,
    user,
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
  } = useAppStore();

  const [activeView, setActiveView] = useState<AppView>('intro');
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Music player state
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.45);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);

  const tracksRef = useRef<MusicTrack[]>(tracks);
  const wantsAutoPlayRef = useRef(false);
  const hasAutoPlayedRef = useRef(false);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    audioEngine.setSfxEnabled(sfxEnabled);
  }, [sfxEnabled]);

  useEffect(() => {
    audioEngine.setVolume(volume);
  }, [volume]);

  // Auto-hide floating admin notification toast after 6 seconds
  useEffect(() => {
    if (!latestToast) return;
    const timer = window.setTimeout(() => {
      dismissToast();
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [latestToast, dismissToast]);

  // Stop music immediately if active track is deleted from Firestore
  useEffect(() => {
    if (currentTrackId && !tracks.some((t) => t.id === currentTrackId)) {
      audioEngine.stopMusic();
      setIsPlaying(false);
      setCurrentTrackId(null);
    }
  }, [tracks, currentTrackId]);

  // Keep hash navigation synchronized for separate character detail pages
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/char/')) {
        const id = decodeURIComponent(hash.slice('#/char/'.length));
        if (characters.some((c) => c.id === id)) {
          setSelectedCharId(id);
          setActiveView('detail');
        }
      } else if (hash === '#/gallery' && activeView === 'detail') {
        setSelectedCharId(null);
        setActiveView('gallery');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [characters, activeView]);

  const currentTrack = useMemo(() => {
    if (!tracks.length) return null;
    if (currentTrackId) {
      return tracks.find((t) => t.id === currentTrackId) || tracks[0];
    }
    return tracks[0];
  }, [tracks, currentTrackId]);

  const selectedCharacter = useMemo(
    () => characters.find((c) => c.id === selectedCharId) || null,
    [characters, selectedCharId]
  );

  const playSelectedTrack = useCallback((track: MusicTrack) => {
    setAudioNotice(null);
    setCurrentTrackId(track.id);
    setIsPlaying(true);

    const handleTrackEnded =
      tracksRef.current.length > 1
        ? () => {
            const nextRandom = pickRandomTrack(tracksRef.current, track.id);
            if (nextRandom) {
              playSelectedTrack(nextRandom);
            }
          }
        : undefined;

    audioEngine.playTrack(
      track,
      (msg) => {
        setAudioNotice(msg);
        setIsPlaying(false);
      },
      handleTrackEnded
    );
  }, []);

  // If user entered before tracks finished loading from Firestore, start random playback as soon as tracks arrive
  useEffect(() => {
    if (
      activeView !== 'intro' &&
      wantsAutoPlayRef.current &&
      !hasAutoPlayedRef.current &&
      tracks.length > 0
    ) {
      const randomTrack = pickRandomTrack(tracks);
      if (randomTrack) {
        hasAutoPlayedRef.current = true;
        wantsAutoPlayRef.current = false;
        playSelectedTrack(randomTrack);
      }
    }
  }, [activeView, tracks, playSelectedTrack]);

  const handleEnterSite = () => {
    audioEngine.playEnter();
    audioEngine.unlock();
    setActiveView('gallery');
    window.location.hash = '#/gallery';
    wantsAutoPlayRef.current = true;
    if (tracks.length > 0) {
      const randomTrack = pickRandomTrack(tracks);
      if (randomTrack) {
        hasAutoPlayedRef.current = true;
        wantsAutoPlayRef.current = false;
        playSelectedTrack(randomTrack);
      }
    }
  };

  const handleTogglePlay = () => {
    if (!currentTrack) return;
    if (isPlaying) {
      audioEngine.stopMusic();
      setIsPlaying(false);
    } else {
      playSelectedTrack(currentTrack);
    }
  };

  const handleNextTrack = () => {
    if (!tracks.length) return;
    const next = pickRandomTrack(tracks, currentTrack?.id);
    if (next) {
      playSelectedTrack(next);
    }
  };

  const handleSelectCharacter = (id: string) => {
    setSelectedCharId(id);
    setActiveView('detail');
    window.location.hash = `#/char/${encodeURIComponent(id)}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (view: AppView) => {
    setActiveView(view);
    if (view !== 'detail') {
      setSelectedCharId(null);
      window.location.hash = `#/${view}`;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCharacter = async (id: string) => {
    const ok = await deleteCharacter(id);
    if (ok && selectedCharId === id) {
      setSelectedCharId(null);
    }
    return ok;
  };

  const handleDeleteTrack = async (id: string) => {
    if (currentTrack?.id === id) {
      audioEngine.stopMusic();
      setIsPlaying(false);
      setCurrentTrackId(null);
    }
    return deleteTrack(id);
  };

  if (activeView === 'intro') {
    return <IntroScreen onEnter={handleEnterSite} />;
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden bg-[#030303] text-[#ece5e4]">
      {/* Main Page distinct pitch-black obsidian background with deep subtle crimson abyss haze */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,rgba(82,11,9,0.22),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(45,6,6,0.2),transparent_55%)]"
      />
      <SmokeCanvas variant="main" />

      <Navbar
        activeView={activeView}
        user={user}
        sfxEnabled={sfxEnabled}
        notifications={notifications}
        onNavigate={handleNavigate}
        onSelectCharacter={handleSelectCharacter}
        onMarkNotificationRead={markNotificationRead}
        onMarkAllRead={markAllNotificationsRead}
        onDeleteNotification={deleteNotification}
        onToggleSfx={() => setSfxEnabled((v) => !v)}
        onOpenAuth={() => setAuthModalOpen(true)}
        onSignOut={() => {
          signOut();
        }}
      />

      {/* Real-time Admin Notification Toast */}
      {user?.isAdmin && latestToast && (
        <div className="fixed top-16 right-4 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-[#8b1814]/85 bg-[#0e0404]/95 p-3.5 shadow-[0_14px_40px_rgba(0,0,0,0.9)] backdrop-blur-md">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 shrink-0">
              {latestToast.type === 'like' ? (
                <Heart className="h-4 w-4 fill-[#c9382e] text-[#c9382e]" />
              ) : (
                <MessageSquare className="h-4 w-4 text-[#d95348]" />
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                audioEngine.playNavigate();
                markNotificationRead(latestToast.id);
                handleSelectCharacter(latestToast.characterId);
                dismissToast();
              }}
              className="min-w-0 flex-1 text-left cursor-pointer"
            >
              <p className="text-xs text-[#f2e8e7] leading-snug">
                <strong>{latestToast.actorName}</strong>{' '}
                {latestToast.type === 'like' ? 'vừa thả tim' : 'vừa bình luận'}{' '}
                <span className="text-[#e06d64]">{latestToast.characterName}</span>
              </p>
              {latestToast.type === 'comment' && latestToast.message && (
                <p className="mt-1 line-clamp-2 text-[11px] text-[#baa8a6]">
                  “{latestToast.message}”
                </p>
              )}
            </button>
            <button
              type="button"
              onClick={dismissToast}
              aria-label="Đóng thông báo"
              className="shrink-0 p-1 text-[#8f7978] hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {audioNotice && (
        <div className="relative z-20 mx-auto mt-3 max-w-xl rounded-lg border border-[#6e1613] bg-[#160505] px-4 py-2 text-center text-xs text-[#e5b3ae]">
          {audioNotice}
        </div>
      )}

      {/* Main Content Area (Dedicated page switching — no overlay on previous page) */}
      <main className="relative z-10 flex-1">
        {activeView === 'gallery' && (
          <GalleryPage
            characters={characters}
            loading={charsLoading}
            likes={likes}
            comments={comments}
            onSelectCharacter={handleSelectCharacter}
          />
        )}

        {activeView === 'detail' && selectedCharacter && (
          <CharacterDetailPage
            character={selectedCharacter}
            likes={likes[selectedCharacter.id] || []}
            comments={comments.filter(
              (c) => c.characterId === selectedCharacter.id
            )}
            user={user}
            onBack={() => handleNavigate('gallery')}
            onToggleLike={toggleLike}
            onAddComment={addComment}
            onDeleteComment={deleteComment}
            onRequestAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeView === 'detail' && !selectedCharacter && (
          <div className="mx-auto max-w-xl px-4 py-20 text-center">
            <p className="text-sm text-[#9c8685]">
              Nhân vật này không còn tồn tại hoặc đã bị xoá.
            </p>
            <button
              type="button"
              onClick={() => handleNavigate('gallery')}
              className="mt-4 rounded-lg bg-[#8b1814] px-4 py-2 text-xs font-medium text-white cursor-pointer"
            >
              Về danh sách nhân vật
            </button>
          </div>
        )}

        {activeView === 'music' && (
          <MusicPage
            tracks={tracks}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            volume={volume}
            onSelectTrack={playSelectedTrack}
            onTogglePlay={handleTogglePlay}
            onChangeVolume={setVolume}
          />
        )}

        {activeView === 'admin' && (
          <AdminPage
            user={user}
            characters={characters}
            tracks={tracks}
            onUpsertCharacter={upsertCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onUpsertTrack={upsertTrack}
            onDeleteTrack={handleDeleteTrack}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}
      </main>

      <MusicBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onNextTrack={handleNextTrack}
        onOpenMusicPage={() => handleNavigate('music')}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSignInWithGoogle={signInWithGoogle}
        onSignInWithGoogleRedirect={signInWithGoogleRedirect}
      />
    </div>
  );
}
