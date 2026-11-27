import { LogIn, LogOut, Menu, Volume2, VolumeX, X } from 'lucide-react';
import { useState } from 'react';
import type { AppView, UserSession } from '../types';
import { audioEngine } from '../utils/audioEngine';

interface NavbarProps {
  activeView: AppView;
  user: UserSession | null;
  sfxEnabled: boolean;
  onNavigate: (view: AppView) => void;
  onToggleSfx: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export function Navbar({
  activeView,
  user,
  sfxEnabled,
  onNavigate,
  onToggleSfx,
  onOpenAuth,
  onSignOut,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: AppView; label: string }[] = [
    { id: 'gallery', label: 'Nhân vật' },
    { id: 'music', label: 'Âm nhạc' },
    { id: 'admin', label: 'Quản trị' },
  ];

  const handleNav = (id: AppView) => {
    audioEngine.playNavigate();
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[#521210]/35 bg-[#030303]/88 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:gap-8 sm:px-6">
        {/* Zone 1: Single-line Brand Title */}
        <button
          type="button"
          onClick={() => handleNav('gallery')}
          onMouseEnter={() => audioEngine.playHover()}
          className="font-display title-dark-glow-subtle text-xl font-semibold tracking-tight whitespace-nowrap shrink-0 cursor-pointer sm:text-2xl"
        >
          Cá Ngộ Độc
        </button>

        {/* Zone 2: 4 concise single-line nav links (Desktop) */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-[#a69290]">
          {navItems.map((item) => {
            const isActive =
              activeView === item.id ||
              (item.id === 'gallery' && activeView === 'detail');
            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => audioEngine.playHover()}
                onClick={() => handleNav(item.id)}
                className={`relative py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'text-[#f2e8e7] font-medium'
                    : 'hover:text-[#ece0df]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-0.5 h-[1.5px] bg-[#b82820]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action + SFX toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              onToggleSfx();
            }}
            aria-label={sfxEnabled ? 'Tắt âm thanh tương tác' : 'Bật âm thanh tương tác'}
            title={sfxEnabled ? 'Âm thanh tương tác: Bật' : 'Âm thanh tương tác: Tắt'}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#3d1110]/60 bg-[#0c0505] text-[#c7b2b0] transition-colors hover:border-[#8b1814] hover:text-white cursor-pointer"
          >
            {sfxEnabled ? (
              <Volume2 className="h-4 w-4 text-[#d6453a]" />
            ) : (
              <VolumeX className="h-4 w-4 text-[#6b5a59]" />
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block max-w-[120px] truncate text-xs text-[#c7b2b0]">
                {user.name}
                {user.isAdmin ? ' · Admin' : ''}
              </span>
              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick();
                  onSignOut();
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#4a1210] bg-[#120606] px-3 text-xs font-medium text-[#ebdada] transition-colors hover:border-[#9e1b14] hover:bg-[#1f0909] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Thoát</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onMouseEnter={() => audioEngine.playHover()}
              onClick={() => {
                audioEngine.playClick();
                onOpenAuth();
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#8b1814] px-3.5 text-xs font-medium text-white transition-colors hover:bg-[#a81f1a] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Đăng nhập</span>
            </button>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              setMobileMenuOpen((v) => !v);
            }}
            aria-label="Mở điều hướng"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#3d1110]/60 bg-[#0c0505] text-[#d6c5c4] md:hidden cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-[#3d1110]/50 bg-[#060303] px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive =
                activeView === item.id ||
                (item.id === 'gallery' && activeView === 'detail');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#290807] text-white font-medium'
                      : 'text-[#b5a19f] hover:bg-[#120505]'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}
            {user && (
              <div className="mt-1 border-t border-[#2a0c0b] pt-2 px-3 text-xs text-[#8f7978]">
                Đang đăng nhập: {user.name} {user.isAdmin ? '(Admin)' : ''}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
