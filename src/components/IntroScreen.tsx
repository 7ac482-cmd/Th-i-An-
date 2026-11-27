import { Volume2 } from 'lucide-react';
import { INTRO_BUTTERFLY_BG } from '../data/seedData';
import { SmokeCanvas } from './SmokeCanvas';
import { audioEngine } from '../utils/audioEngine';

interface IntroScreenProps {
  onEnter: () => void;
}

export function IntroScreen({ onEnter }: IntroScreenProps) {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[#1a0403] px-5 py-10">
      {/* Intro-exclusive crimson butterfly wallpaper background (distinct from main page) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat scale-105 opacity-75 transition-transform duration-1000"
        style={{ backgroundImage: `url(${INTRO_BUTTERFLY_BG})` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-black/75 via-[#240605]/45 to-black/90"
      />

      {/* Gentle 3D smoke & butterfly drift */}
      <SmokeCanvas variant="intro" />

      {/* Center focal anchor */}
      <div className="perspective-stage relative z-10 flex w-full max-w-xl flex-col items-center text-center">
        <div className="animate-float-gentle flex flex-col items-center">
          <p className="mb-4 text-xs tracking-[0.28em] text-[#e5b3ae]/80 uppercase">
            Kho Lưu Trữ Nhân Vật
          </p>

          <h1 className="font-display title-dark-glow text-5xl font-semibold tracking-tight sm:text-7xl text-balance">
            Cá Ngộ Độc
          </h1>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-[#e6d5d3]/85 sm:text-base">
            Giữa làn khói đỏ thẫm và bóng bướm đêm, mỗi nhân vật giữ lại một mảnh cốt truyện chưa từng kể.
          </p>

          <button
            type="button"
            onMouseEnter={() => audioEngine.playHover()}
            onClick={onEnter}
            className="mt-9 inline-flex items-center gap-2.5 rounded-full border border-[#d6453a]/50 bg-black/75 px-7 py-3.5 text-sm font-medium text-[#f5eceb] shadow-[0_0_30px_rgba(158,27,20,0.45)] backdrop-blur-md transition-all duration-300 hover:border-[#e65a4f] hover:bg-[#380907]/85 hover:shadow-[0_0_40px_rgba(196,43,28,0.65)] active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c42b1c]"
          >
            <Volume2 className="h-4 w-4 text-[#e0564b]" />
            <span>Bước vào không gian</span>
          </button>

          <p className="mt-4 text-xs text-[#cbb4b2]/65">
            Âm nhạc và hiệu ứng tương tác sẽ tự động phát khi bạn bước vào
          </p>
        </div>
      </div>
    </div>
  );
}
