import { useState } from 'react';
import { User } from 'lucide-react';

interface AvatarFrameProps {
  src: string;
  alt: string;
  dimmed?: boolean;
  size?: 'card' | 'detail' | 'thumb';
  className?: string;
}

export function AvatarFrame({
  src,
  alt,
  dimmed = false,
  size = 'card',
  className = '',
}: AvatarFrameProps) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses =
    size === 'thumb'
      ? 'w-12 h-12 rounded-lg'
      : size === 'detail'
        ? 'w-full max-w-[340px] aspect-square rounded-2xl'
        : 'w-full aspect-square rounded-xl';

  return (
    <div
      className={`group/frame relative overflow-hidden bg-[#0a0303] border border-[#6e1411]/45 shadow-[0_12px_36px_-12px_rgba(158,27,20,0.45),inset_0_0_28px_rgba(120,14,12,0.35)] ${sizeClasses} ${className}`}
    >
      {/* Crimson butterfly ambient frame aura */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-[#9e1b14]/15 via-transparent to-[#040202]/85"
      />

      {/* Corner hairline filigree matching crimson-black theme */}
      {size !== 'thumb' && (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-2 left-2 z-20 h-3 w-3 border-t border-l border-[#b82820]/60"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-2 right-2 z-20 h-3 w-3 border-t border-r border-[#b82820]/60"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 left-2 z-20 h-3 w-3 border-b border-l border-[#b82820]/60"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 right-2 z-20 h-3 w-3 border-b border-r border-[#b82820]/60"
          />
        </>
      )}

      {!imgError && src ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`h-full w-full object-cover transition-all duration-700 ease-out ${
            dimmed
              ? 'opacity-40 group-hover:opacity-65 group-hover:scale-[1.03]'
              : 'opacity-95 group-hover/frame:scale-[1.02]'
          }`}
        />
      ) : (
        <div
          className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#1f0707] via-[#0b0303] to-[#040404] text-[#b9443e] ${
            dimmed ? 'opacity-40' : 'opacity-90'
          }`}
        >
          <User className="h-8 w-8 opacity-60" />
          {size !== 'thumb' && (
            <span className="mt-2 px-3 text-center text-xs text-[#9c7876] truncate max-w-full">
              {alt}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
