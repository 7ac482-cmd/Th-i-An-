import { Disc3, Pause, Play, Volume2 } from 'lucide-react';
import type { MusicTrack } from '../types';
import { audioEngine } from '../utils/audioEngine';

interface MusicPageProps {
  tracks: MusicTrack[];
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  volume: number;
  onSelectTrack: (track: MusicTrack) => void;
  onTogglePlay: () => void;
  onChangeVolume: (val: number) => void;
}

export function MusicPage({
  tracks,
  currentTrack,
  isPlaying,
  volume,
  onSelectTrack,
  onTogglePlay,
  onChangeVolume,
}: MusicPageProps) {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 pb-24 sm:px-6 sm:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] text-[#b3534d] uppercase">
            Không gian âm thanh
          </p>
          <h1 className="font-display title-dark-glow mt-1.5 text-3xl font-semibold tracking-tight sm:text-5xl">
            Danh sách Nhạc nền
          </h1>
        </div>

        {/* Volume Slider */}
        <div className="flex items-center gap-3 rounded-xl border border-[#3d1110]/60 bg-[#080303] px-4 py-2.5">
          <Volume2 className="h-4 w-4 text-[#c9382e]" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={volume}
            onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
            aria-label="Âm lượng nhạc"
            className="h-1.5 w-28 accent-[#b82820] cursor-pointer"
          />
          <span className="font-mono-num w-9 text-right text-xs text-[#b5a19f]">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>

      {/* Track List */}
      <div className="space-y-3">
        {tracks.length === 0 ? (
          <div className="rounded-xl border border-[#3d1110]/50 bg-[#080303] p-10 text-center text-sm text-[#8f7978]">
            Chưa có bài nhạc nào. Quản trị viên có thể thêm bài nhạc trong mục Quản trị.
          </div>
        ) : (
          tracks.map((track, idx) => {
            const active = currentTrack?.id === track.id;
            return (
              <div
                key={track.id}
                onMouseEnter={() => audioEngine.playHover()}
                onClick={() => {
                  audioEngine.playClick();
                  if (active) {
                    onTogglePlay();
                  } else {
                    onSelectTrack(track);
                  }
                }}
                className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition-all cursor-pointer ${
                  active
                    ? 'border-[#9e1b14] bg-[#160505]'
                    : 'border-[#300d0c]/60 bg-[#080303] hover:border-[#6e1613] hover:bg-[#0e0404]'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#4a1210] bg-[#120404]">
                    {active && isPlaying ? (
                      <Pause className="h-4 w-4 text-[#e0564b]" />
                    ) : active ? (
                      <Play className="h-4 w-4 text-[#e0564b] ml-0.5" />
                    ) : (
                      <Disc3 className="h-4 w-4 text-[#7d6968]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#efe5e4]">
                      {String(idx + 1).padStart(2, '0')}. {track.title}
                    </p>
                    {track.artist && (
                      <p className="truncate text-xs text-[#9c8685]">
                        {track.artist}
                      </p>
                    )}
                  </div>
                </div>

                {track.durationLabel && (
                  <span className="font-mono-num shrink-0 text-xs text-[#8f7978]">
                    {track.durationLabel}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
