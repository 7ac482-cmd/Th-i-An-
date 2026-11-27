import { ArrowUpRight, Heart, MessageSquare, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CharacterItem, CommentItem } from '../types';
import { audioEngine } from '../utils/audioEngine';
import { AvatarFrame } from './AvatarFrame';

interface GalleryPageProps {
  characters: CharacterItem[];
  loading: boolean;
  likes: Record<string, string[]>;
  comments: CommentItem[];
  onSelectCharacter: (id: string) => void;
}

export function GalleryPage({
  characters,
  loading,
  likes,
  comments,
  onSelectCharacter,
}: GalleryPageProps) {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string>('all');

  const allTags = useMemo(() => {
    const set = new Set<string>();
    characters.forEach((c) => c.hashtags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [characters]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return characters.filter((char) => {
      const matchTag = activeTag === 'all' || char.hashtags.includes(activeTag);
      if (!matchTag) return false;
      if (!q) return true;
      return (
        char.name.toLowerCase().includes(q) ||
        char.slogan.toLowerCase().includes(q) ||
        char.hashtags.some((h) => h.toLowerCase().includes(q))
      );
    });
  }, [characters, query, activeTag]);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 pb-24 sm:px-6 sm:py-12">
      {/* Header Lead */}
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] text-[#b3534d] uppercase">
            Danh mục lưu trữ
          </p>
          <h1 className="font-display title-dark-glow mt-1.5 text-3xl font-semibold tracking-tight sm:text-5xl text-balance">
            Hồ Sơ Nhân Vật
          </h1>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d6968]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tên, hashtag, slogan..."
            className="h-10 w-full rounded-lg border border-[#3d1110]/70 bg-[#090404] pl-9 pr-3 text-sm text-[#efe5e4] placeholder:text-[#6e5b5a] focus:border-[#9e1b14] focus:outline-none"
          />
        </div>
      </div>

      {/* Hashtag Filter Tabs */}
      {allTags.length > 0 && (
        <div className="mb-8 flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              setActiveTag('all');
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTag === 'all'
                ? 'bg-[#8b1814] text-white'
                : 'bg-[#0e0606] text-[#a38e8c] hover:text-white'
            }`}
          >
            Tất cả ({characters.length})
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                audioEngine.playClick();
                setActiveTag(tag);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTag === tag
                  ? 'bg-[#8b1814] text-white'
                  : 'bg-[#0e0606] text-[#a38e8c] hover:text-white'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Character Grid */}
      {loading ? (
        <div className="rounded-2xl border border-[#3d1110]/50 bg-[#080303] px-6 py-16 text-center">
          <p className="text-sm text-[#9c8685]">Đang tải danh sách nhân vật...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#3d1110]/50 bg-[#080303] px-6 py-16 text-center">
          <p className="text-sm text-[#9c8685]">
            {characters.length === 0
              ? 'Chưa có nhân vật nào. Quản trị viên có thể thêm nhân vật mới trong mục Quản trị.'
              : 'Không tìm thấy nhân vật phù hợp với bộ lọc hiện tại.'}
          </p>
        </div>
      ) : (
        <div className="perspective-stage grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((char) => {
            const likeCount = (likes[char.id] || []).length;
            const commentCount = comments.filter(
              (c) => c.characterId === char.id
            ).length;

            return (
              <article
                key={char.id}
                onMouseEnter={() => audioEngine.playHover()}
                onClick={() => {
                  audioEngine.playNavigate();
                  onSelectCharacter(char.id);
                }}
                className="card-3d group flex flex-col justify-between rounded-2xl border border-[#421210]/55 bg-[#080303]/90 p-4 shadow-[0_14px_34px_-18px_rgba(0,0,0,0.95)] hover:border-[#9e1b14]/80 hover:shadow-[0_18px_40px_-14px_rgba(158,27,20,0.35)] cursor-pointer"
              >
                <div>
                  {/* Framed Avatar with 40% opacity (dimmed=true) */}
                  <AvatarFrame src={char.avatar} alt={char.name} dimmed size="card" />

                  <div className="mt-4">
                    <h2 className="font-display title-dark-glow-subtle text-2xl font-semibold tracking-tight text-[#f4ebeb]">
                      {char.name}
                    </h2>

                    {/* Clean unboxed hashtags */}
                    {char.hashtags.length > 0 && (
                      <p className="mt-1.5 text-xs text-[#b5554e] truncate">
                        {char.hashtags.join(' · ')}
                      </p>
                    )}

                    {char.slogan.trim() && (
                      <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-[#baa8a6]">
                        “{char.slogan}”
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-[#290b0a] pt-3.5 text-xs text-[#8f7a79]">
                  <div className="flex items-center gap-3.5 font-mono-num">
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5 text-[#b82820]" />
                      <span>{likeCount}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{commentCount}</span>
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 font-medium text-[#e0cecd] transition-colors group-hover:text-white whitespace-nowrap">
                    <span>Xem chi tiết</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-[#d6453a] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
