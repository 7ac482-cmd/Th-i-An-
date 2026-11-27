import { X } from 'lucide-react';
import { useState } from 'react';
import { audioEngine } from '../utils/audioEngine';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignInWithGoogle: () => Promise<unknown>;
}

export function AuthModal({
  isOpen,
  onClose,
  onSignInWithGoogle,
}: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    audioEngine.playClick();
    setLoading(true);
    setErrorMsg(null);
    try {
      await onSignInWithGoogle();
      audioEngine.playEnter();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('popup-closed-by-user')) {
        setErrorMsg('Bạn đã đóng cửa sổ đăng nhập Google.');
      } else if (msg.includes('popup-blocked')) {
        setErrorMsg('Trình duyệt đang chặn cửa sổ bật lên. Vui lòng cho phép popup để đăng nhập Google.');
      } else {
        setErrorMsg('Không thể đăng nhập Google lúc này. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Đăng nhập Google"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-[#521210]/80 bg-[#080303] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.95)]">
        <button
          type="button"
          onClick={() => {
            audioEngine.playClick();
            onClose();
          }}
          aria-label="Đóng cửa sổ đăng nhập"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[#9c8685] hover:bg-[#1a0707] hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="font-display title-dark-glow-subtle text-3xl font-semibold">
          Đăng nhập Google
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-[#a89493]">
          Đăng nhập bằng tài khoản Google để thả tim và bình luận nhân vật.
        </p>

        {errorMsg && (
          <p className="mt-4 rounded-lg border border-[#7f1d1d] bg-[#1c0606] px-3 py-2 text-xs text-[#f0a5a0]">
            {errorMsg}
          </p>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleLogin}
          className="mt-6 flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-[#521210] bg-[#140505] px-4 text-sm font-medium text-white transition-colors hover:border-[#b82820] hover:bg-[#240908] disabled:opacity-50 cursor-pointer"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.8-5.4 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"
            />
          </svg>
          <span>{loading ? 'Đang kết nối Google...' : 'Tiếp tục với Google'}</span>
        </button>
      </div>
    </div>
  );
}
