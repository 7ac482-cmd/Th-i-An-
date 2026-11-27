import { Disc3, Pause, Play, SkipForward } from 'lucide-react';
import type { MusicTrack } from '../types';
import { audioEngine } from '../utils/audioEngine';

interface MusicBarProps {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onOpenMusicPage: () => void;
}

export function MusicBar({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onNextTrack,
  onOpenMusicPage,
}: MusicBarProps) {
  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 border-t border-[#521210]/45 bg-[#050202]/92 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => {
            audioEngine.playClick();
            onOpenMusicPage();
          }}
          className="flex min-w-0 items-center gap-2.5 text-left cursor-pointer group"
        >
          <Disc3
            className={`h-4 w-4 shrink-0 text-[#c9382e] ${
              isPlaying ? 'animate-spin' : ''
            }`}
            style={{ animationDuration: '6s' }}
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[#eee4e3] group-hover:text-white">
              {currentTrack.title}
            </p>
          </div>
          {currentTrack.artist && (
            <span className="hidden sm:inline-block text-xs text-[#8f7978] whitespace-nowrap">
              · {currentTrack.artist}
            </span>
          )}
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              onTogglePlay();
            }}
            aria-label={isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc'}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[#521210]/60 bg-[#140505] text-[#f0e5e4] transition-colors hover:border-[#b82820] cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5 ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              onNextTrack();
            }}
            aria-label="Bài tiếp theo"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[#3d1110]/60 bg-[#0d0404] text-[#cbb8b6] transition-colors hover:border-[#8b1814] hover:text-white cursor-pointer"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
