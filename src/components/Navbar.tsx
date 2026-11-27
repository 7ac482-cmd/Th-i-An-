import {
  Bell,
  CheckCheck,
  Heart,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { AdminNotification, AppView, UserSession } from '../types';
import { audioEngine } from '../utils/audioEngine';

interface NavbarProps {
  activeView: AppView;
  user: UserSession | null;
  sfxEnabled: boolean;
  notifications: AdminNotification[];
  onNavigate: (view: AppView) => void;
  onSelectCharacter: (characterId: string) => void;
  onMarkNotificationRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDeleteNotification: (id: string) => void;
  onToggleSfx: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export function Navbar({
  activeView,
  user,
  sfxEnabled,
  notifications,
  onNavigate,
  onSelectCharacter,
  onMarkNotificationRead,
  onMarkAllRead,
  onDeleteNotification,
  onToggleSfx,
  onOpenAuth,
  onSignOut,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifContainerRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const navItems: { id: AppView; label: string }[] = [
    { id: 'gallery', label: 'Nhân vật' },
    { id: 'music', label: 'Âm nhạc' },
    { id: 'admin', label: 'Quản trị' },
  ];

  const handleNav = (id: AppView) => {
    audioEngine.playNavigate();
    onNavigate(id);
    setMobileMenuOpen(false);
    setNotifOpen(false);
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

        {/* Zone 2: Clean single-line nav links (Desktop) */}
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

        {/* Zone 3: Admin Notifications + SFX toggle + Auth Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          {user?.isAdmin && (
            <div ref={notifContainerRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick();
                  setNotifOpen((v) => !v);
                }}
                aria-label="Thông báo tương tác"
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#3d1110]/60 bg-[#0c0505] text-[#c7b2b0] transition-colors hover:border-[#8b1814] hover:text-white cursor-pointer"
              >
                <Bell className="h-4 w-4 text-[#d6453a]" />
                {unreadCount > 0 && (
                  <span className="font-mono-num absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#b82820] px-1 text-[10px] font-semibold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-[#521210]/80 bg-[#080303] shadow-[0_20px_50px_rgba(0,0,0,0.95)] overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[#2e0c0b] px-4 py-3">
                    <span className="text-xs font-semibold text-[#f2e8e7]">
                      Thông báo ({unreadCount} chưa đọc)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          audioEngine.playClick();
                          onMarkAllRead();
                        }}
                        className="inline-flex items-center gap-1 text-[11px] text-[#d95348] hover:underline cursor-pointer"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span>Đã đọc tất cả</span>
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-[#240908]">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-xs text-[#8f7978]">
                        Chưa có thông báo thả tim hay bình luận nào.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`flex items-start gap-2.5 px-4 py-3 transition-colors ${
                            n.read ? 'bg-[#070303]' : 'bg-[#170606]'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {n.type === 'like' ? (
                              <Heart className="h-3.5 w-3.5 fill-[#c9382e] text-[#c9382e]" />
                            ) : (
                              <MessageSquare className="h-3.5 w-3.5 text-[#d95348]" />
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              audioEngine.playNavigate();
                              if (!n.read) onMarkNotificationRead(n.id);
                              onSelectCharacter(n.characterId);
                              setNotifOpen(false);
                            }}
                            className="min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <p className="text-xs text-[#efe4e3] leading-snug">
                              <strong className="font-medium">{n.actorName}</strong>{' '}
                              {n.type === 'like' ? 'đã thả tim' : 'đã bình luận về'}{' '}
                              <span className="text-[#e06d64]">{n.characterName}</span>
                            </p>
                            {n.type === 'comment' && n.message && (
                              <p className="mt-1 line-clamp-2 text-[11px] text-[#baa8a6]">
                                “{n.message}”
                              </p>
                            )}
                            <p className="mt-1 font-mono-num text-[10px] text-[#7d6968]">
                              {new Date(n.createdAt).toLocaleString('vi-VN')}
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              audioEngine.playClick();
                              onDeleteNotification(n.id);
                            }}
                            aria-label="Xoá thông báo"
                            className="shrink-0 p-1 text-[#7d6968] hover:text-[#e0564b] cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

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
                Đang đăng nhập: {user.name}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
