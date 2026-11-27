import { Lock, Music, Plus, Save, Trash2, Upload, UserPlus } from 'lucide-react';
import { useState } from 'react';
import type {
  CharacterItem,
  CharacterLink,
  MusicTrack,
  UserSession,
} from '../types';
import { audioEngine } from '../utils/audioEngine';

interface AdminPageProps {
  user: UserSession | null;
  characters: CharacterItem[];
  tracks: MusicTrack[];
  onUpsertCharacter: (
    data: Omit<CharacterItem, 'createdAt'> & { createdAt?: number }
  ) => Promise<boolean>;
  onDeleteCharacter: (id: string) => Promise<boolean>;
  onUpsertTrack: (track: MusicTrack) => Promise<boolean>;
  onDeleteTrack: (id: string) => Promise<boolean>;
  onOpenAuth: () => void;
}

// Compress uploaded images so avatar fits cleanly under Firestore document limits
async function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const maxDim = 560;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Canvas unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể đọc tệp ảnh'));
    };
    img.src = objectUrl;
  });
}

export function AdminPage({
  user,
  characters,
  tracks,
  onUpsertCharacter,
  onDeleteCharacter,
  onUpsertTrack,
  onDeleteTrack,
  onOpenAuth,
}: AdminPageProps) {
  const [tab, setTab] = useState<'chars' | 'music'>('chars');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Character form state — completely empty by default for admin to fill in
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [charName, setCharName] = useState('');
  const [charAvatar, setCharAvatar] = useState('');
  const [charHashtags, setCharHashtags] = useState('');
  const [charSlogan, setCharSlogan] = useState('');
  const [charLore, setCharLore] = useState('');
  const [charLinksText, setCharLinksText] = useState('');

  // Music form state — trackTitle is strictly named by admin, never inferred from link
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [trackTitle, setTrackTitle] = useState('');
  const [trackArtist, setTrackArtist] = useState('');
  const [trackSource, setTrackSource] = useState('');
  const [preservedDuration, setPreservedDuration] = useState('');

  if (!user?.isAdmin) {
    return (
      <section className="mx-auto w-full max-w-xl px-4 py-16 pb-24 text-center">
        <div className="rounded-2xl border border-[#4a1210]/70 bg-[#080303] p-8">
          <Lock className="mx-auto h-8 w-8 text-[#c9382e]" />
          <h1 className="font-display title-dark-glow mt-4 text-3xl font-semibold">
            Khu vực Quản trị
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#b39d9c]">
            Chỉ quản trị viên mới có quyền thêm, chỉnh sửa hoặc xoá nhân vật và nhạc nền.
          </p>
          {user && (
            <p className="mt-2 text-xs text-[#9c7977]">
              Tài khoản hiện tại không có quyền quản trị.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              onOpenAuth();
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#8b1814] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#a81f1a] cursor-pointer"
          >
            Đăng nhập tài khoản Admin
          </button>
        </div>
      </section>
    );
  }

  const resetCharForm = () => {
    setEditingCharId(null);
    setCharName('');
    setCharAvatar('');
    setCharHashtags('');
    setCharSlogan('');
    setCharLore('');
    setCharLinksText('');
  };

  const handleEditChar = (c: CharacterItem) => {
    audioEngine.playClick();
    setEditingCharId(c.id);
    setCharName(c.name);
    setCharAvatar(c.avatar);
    setCharHashtags(c.hashtags.join(', '));
    setCharSlogan(c.slogan);
    setCharLore(c.lore);
    setCharLinksText(c.links.map((l) => `${l.label}|${l.url}`).join('\n'));
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToDataUrl(file);
      if (compressed.length > 290000) {
        setNotice('Ảnh sau khi nén vẫn quá lớn, vui lòng chọn ảnh nhỏ hơn hoặc dán URL.');
        return;
      }
      setCharAvatar(compressed);
      setNotice(null);
    } catch {
      setNotice('Không thể xử lý tệp ảnh này.');
    }
  };

  const handleSaveChar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!charName.trim() || saving) return;
    audioEngine.playClick();
    setSaving(true);
    setNotice(null);

    const parsedTags = charHashtags
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 15)
      .map((t) => (t.startsWith('#') ? t : `#${t}`));

    const parsedLinks: CharacterLink[] = charLinksText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 10)
      .map((line) => {
        const [label, url] = line.split('|').map((s) => s.trim());
        if (url) return { label, url };
        return { label: 'Liên kết', url: label };
      });

    const id =
      editingCharId ||
      `${charName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'char'}-${Date.now().toString(36)}`;

    try {
      await onUpsertCharacter({
        id,
        name: charName.trim(),
        avatar: charAvatar.trim(),
        hashtags: parsedTags,
        slogan: charSlogan.trim(),
        lore: charLore.trim(),
        links: parsedLinks,
      });
      resetCharForm();
      setNotice('Đã lưu nhân vật lên Firestore.');
    } catch (err) {
      setNotice(
        err instanceof Error
          ? `Lỗi khi lưu nhân vật: ${err.message}`
          : 'Không thể lưu nhân vật lên Firestore.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChar = async (id: string) => {
    if (deletingId) return;
    audioEngine.playClick();
    setDeletingId(id);
    setNotice(null);
    try {
      await onDeleteCharacter(id);
      if (editingCharId === id) {
        resetCharForm();
      }
      setNotice('Đã xoá nhân vật khỏi Firestore.');
    } catch (err) {
      setNotice(
        err instanceof Error
          ? `Lỗi khi xoá nhân vật: ${err.message}`
          : 'Không thể xoá nhân vật khỏi Firestore.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const resetTrackForm = () => {
    setEditingTrackId(null);
    setTrackTitle('');
    setTrackArtist('');
    setTrackSource('');
    setPreservedDuration('');
  };

  const handleEditTrack = (t: MusicTrack) => {
    audioEngine.playClick();
    setEditingTrackId(t.id);
    setTrackTitle(t.title);
    setTrackArtist(t.artist);
    setTrackSource(t.sourceType === 'url' ? t.source : '');
    setPreservedDuration(t.durationLabel);
  };

  const handleAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 360 * 1024) {
      setNotice('Tệp nhạc tải lên nên nhỏ hơn 360KB để lưu trực tiếp, hoặc hãy dán link nhạc trên web.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        if (reader.result.length > 495000) {
          setNotice('Tệp nhạc sau khi mã hoá vượt quá giới hạn lưu trữ, vui lòng chọn tệp nhỏ hơn hoặc dán link nhạc trên web.');
          return;
        }
        setTrackSource(reader.result);
        setNotice(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackTitle.trim() || !trackSource.trim() || saving) return;
    audioEngine.playClick();
    setSaving(true);
    setNotice(null);
    try {
      await onUpsertTrack({
        id: editingTrackId || `track-${Date.now().toString(36)}`,
        title: trackTitle.trim(),
        artist: trackArtist.trim(),
        sourceType: 'url',
        source: trackSource.trim(),
        durationLabel: editingTrackId ? preservedDuration : '',
      });
      resetTrackForm();
      setNotice('Đã lưu bài nhạc lên Firestore.');
    } catch (err) {
      setNotice(
        err instanceof Error
          ? `Lỗi khi lưu bài nhạc: ${err.message}`
          : 'Không thể lưu bài nhạc lên Firestore.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTrack = async (id: string) => {
    if (deletingId) return;
    audioEngine.playClick();
    setDeletingId(id);
    setNotice(null);
    try {
      await onDeleteTrack(id);
      if (editingTrackId === id) {
        resetTrackForm();
      }
      setNotice('Đã xoá bài nhạc khỏi Firestore.');
    } catch (err) {
      setNotice(
        err instanceof Error
          ? `Lỗi khi xoá bài nhạc: ${err.message}`
          : 'Không thể xoá bài nhạc khỏi Firestore.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 pb-24 sm:px-6 sm:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] text-[#b3534d] uppercase">
            Quản trị Firestore
          </p>
          <h1 className="font-display title-dark-glow mt-1.5 text-3xl font-semibold sm:text-5xl">
            Bảng điều khiển Admin
          </h1>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-[#0d0505] p-1 border border-[#3d1110]/60">
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              setTab('chars');
            }}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
              tab === 'chars'
                ? 'bg-[#8b1814] text-white'
                : 'text-[#b5a19f] hover:text-white'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Nhân vật ({characters.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              setTab('music');
            }}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
              tab === 'music'
                ? 'bg-[#8b1814] text-white'
                : 'text-[#b5a19f] hover:text-white'
            }`}
          >
            <Music className="h-3.5 w-3.5" />
            <span>Âm nhạc ({tracks.length})</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="mb-6 rounded-lg border border-[#6e1613] bg-[#160505] px-4 py-2.5 text-xs text-[#e5b3ae]">
          {notice}
        </div>
      )}

      {tab === 'chars' ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Form thêm/sửa nhân vật — trống hoàn toàn để admin tự điền */}
          <form
            onSubmit={handleSaveChar}
            className="rounded-2xl border border-[#3d1110]/70 bg-[#080303] p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#f0e4e3]">
                {editingCharId ? 'Chỉnh sửa nhân vật' : 'Thêm nhân vật mới'}
              </h2>
              {editingCharId && (
                <button
                  type="button"
                  onClick={resetCharForm}
                  className="text-xs text-[#c9382e] hover:underline cursor-pointer"
                >
                  Hủy sửa
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs text-[#b5a19f] mb-1.5">
                Tên nhân vật *
              </label>
              <input
                type="text"
                required
                maxLength={120}
                value={charName}
                onChange={(e) => setCharName(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#3d1110]/70 bg-[#040202] px-3 text-sm text-white focus:border-[#9e1b14] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#b5a19f] mb-1.5">
                Avatar (dán URL hoặc tải ảnh lên)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={charAvatar}
                  onChange={(e) => setCharAvatar(e.target.value)}
                  className="h-10 flex-1 rounded-lg border border-[#3d1110]/70 bg-[#040202] px-3 text-sm text-white focus:border-[#9e1b14] focus:outline-none"
                />
                <label className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#4a1210] bg-[#120505] px-3 text-xs font-medium text-[#e6d5d4] hover:border-[#9e1b14] cursor-pointer whitespace-nowrap">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Tải ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#b5a19f] mb-1.5">
                Hashtag (cách nhau bởi dấu phẩy)
              </label>
              <input
                type="text"
                value={charHashtags}
                onChange={(e) => setCharHashtags(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#3d1110]/70 bg-[#040202] px-3 text-sm text-white focus:border-[#9e1b14] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#b5a19f] mb-1.5">
                Slogan
              </label>
              <input
                type="text"
                maxLength={300}
                value={charSlogan}
                onChange={(e) => setCharSlogan(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#3d1110]/70 bg-[#040202] px-3 text-sm text-white focus:border-[#9e1b14] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#b5a19f] mb-1.5">
                Cốt truyện
              </label>
              <textarea
                rows={5}
                maxLength={20000}
                value={charLore}
                onChange={(e) => setCharLore(e.target.value)}
                className="w-full rounded-lg border border-[#3d1110]/70 bg-[#040202] p-3 text-sm text-white focus:border-[#9e1b14] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#b5a19f] mb-1.5">
                Liên kết (mỗi dòng dạng: Tên link | URL)
              </label>
              <textarea
                rows={2}
                value={charLinksText}
                onChange={(e) => setCharLinksText(e.target.value)}
                className="w-full rounded-lg border border-[#3d1110]/70 bg-[#040202] p-3 text-sm text-white focus:border-[#9e1b14] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#8b1814] text-sm font-medium text-white transition-colors hover:bg-[#a81f1a] disabled:opacity-50 cursor-pointer"
            >
              {editingCharId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span>
                {saving
                  ? 'Đang đồng bộ...'
                  : editingCharId
                    ? 'Lưu thay đổi'
                    : 'Thêm nhân vật'}
              </span>
            </button>
          </form>

          {/* Danh sách nhân vật hiện có */}
          <div className="space-y-3">
            {characters.length === 0 ? (
              <div className="rounded-xl border border-[#300d0c]/70 bg-[#080303] p-6 text-center text-xs text-[#8f7978]">
                Chưa có nhân vật nào trong danh sách.
              </div>
            ) : (
              characters.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#300d0c]/70 bg-[#080303] p-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#f0e4e3]">
                      {c.name}
                    </p>
                    {c.hashtags.length > 0 && (
                      <p className="truncate text-xs text-[#b3534d]">
                        {c.hashtags.join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEditChar(c)}
                      className="rounded-md border border-[#4a1210] bg-[#120505] px-2.5 py-1.5 text-xs text-[#e3d4d3] hover:border-[#9e1b14] cursor-pointer"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === c.id}
                      onClick={() => handleDeleteChar(c.id)}
                      aria-label={`Xoá ${c.name}`}
                      className="rounded-md border border-[#4a1210]/60 bg-[#120505] p-1.5 text-[#c9382e] hover:bg-[#2b0b09] disabled:opacity-40 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Form thêm/sửa nhạc */}
          <form
            onSubmit={handleSaveTrack}
            className="rounded-2xl border border-[#3d1110]/70 bg-[#080303] p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#f0e4e3]">
                {editingTrackId ? 'Chỉnh sửa bài nhạc' : 'Thêm bài nhạc mới'}
              </h2>
              {editingTrackId && (
                <button
                  type="button"
                  onClick={resetTrackForm}
                  className="text-xs text-[#c9382e] hover:underline cursor-pointer"
                >
                  Hủy sửa
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs text-[#b5a19f] mb-1.5">
                Tên bài nhạc (do Admin đặt) *
              </label>
              <input
                type="text"
                required
                maxLength={120}
                value={trackTitle}
                onChange={(e) => setTrackTitle(e.target.value)}
                placeholder="Nhập tên bài nhạc..."
                className="h-10 w-full rounded-lg border border-[#3d1110]/70 bg-[#040202] px-3 text-sm text-white focus:border-[#9e1b14] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#b5a19f] mb-1.5">
                Nghệ sĩ / Mô tả
              </label>
              <input
                type="text"
                maxLength={120}
                value={trackArtist}
                onChange={(e) => setTrackArtist(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#3d1110]/70 bg-[#040202] px-3 text-sm text-white focus:border-[#9e1b14] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#b5a19f] mb-1.5">
                Nhạc (link trên web hoặc chọn tệp nhạc trên máy) *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={trackSource}
                  onChange={(e) => setTrackSource(e.target.value)}
                  placeholder="Dán link nhạc trên web (https://...) hoặc chọn từ máy"
                  className="h-10 flex-1 rounded-lg border border-[#3d1110]/70 bg-[#040202] px-3 text-sm text-white focus:border-[#9e1b14] focus:outline-none"
                />
                <label className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#4a1210] bg-[#120505] px-3 text-xs font-medium text-[#e6d5d4] hover:border-[#9e1b14] cursor-pointer whitespace-nowrap">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Chọn từ máy</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#8b1814] text-sm font-medium text-white transition-colors hover:bg-[#a81f1a] disabled:opacity-50 cursor-pointer"
            >
              {editingTrackId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span>
                {saving
                  ? 'Đang đồng bộ...'
                  : editingTrackId
                    ? 'Lưu thay đổi'
                    : 'Thêm bài nhạc'}
              </span>
            </button>
          </form>

          {/* Danh sách bài nhạc */}
          <div className="space-y-3">
            {tracks.length === 0 ? (
              <div className="rounded-xl border border-[#300d0c]/70 bg-[#080303] p-6 text-center text-xs text-[#8f7978]">
                Chưa có bài nhạc nào trong danh sách.
              </div>
            ) : (
              tracks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#300d0c]/70 bg-[#080303] p-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#f0e4e3]">
                      {t.title}
                    </p>
                    <p className="truncate text-xs text-[#9c8685]">
                      {[t.artist, t.durationLabel].filter(Boolean).join(' · ') || 'Nhạc nền'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEditTrack(t)}
                      className="rounded-md border border-[#4a1210] bg-[#120505] px-2.5 py-1.5 text-xs text-[#e3d4d3] hover:border-[#9e1b14] cursor-pointer"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === t.id}
                      onClick={() => handleDeleteTrack(t.id)}
                      aria-label={`Xoá ${t.title}`}
                      className="rounded-md border border-[#4a1210]/60 bg-[#120505] p-1.5 text-[#c9382e] hover:bg-[#2b0b09] disabled:opacity-40 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
