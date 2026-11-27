import { ArrowLeft, ExternalLink, Heart, MessageSquare, Send, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CharacterItem, CommentItem, UserSession } from '../types';
import { audioEngine } from '../utils/audioEngine';
import { AvatarFrame } from './AvatarFrame';

interface CharacterDetailPageProps {
  character: CharacterItem;
  likes: string[];
  comments: CommentItem[];
  user: UserSession | null;
  onBack: () => void;
  onToggleLike: (characterId: string) => Promise<boolean>;
  onAddComment: (characterId: string, content: string) => Promise<string | null>;
  onDeleteComment: (characterId: string, commentId: string) => Promise<void>;
  onRequestAuth: () => void;
}

export function CharacterDetailPage({
  character,
  likes,
  comments,
  user,
  onBack,
  onToggleLike,
  onAddComment,
  onDeleteComment,
  onRequestAuth,
}: CharacterDetailPageProps) {
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isLiked = user ? likes.includes(user.id) : false;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 104), 280)}px`;
  }, [commentText]);

  const handleHeart = async () => {
    if (!user) {
      audioEngine.playClick();
      onRequestAuth();
      return;
    }
    setActionError(null);
    const nextLiked = !isLiked;
    audioEngine.playHeart(nextLiked);
    try {
      await onToggleLike(character.id);
    } catch {
      setActionError('Không thể cập nhật lượt tim lúc này. Vui lòng thử lại.');
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      audioEngine.playClick();
      onRequestAuth();
      return;
    }
    if (!commentText.trim() || submitting) return;
    audioEngine.playClick();
    setSubmitting(true);
    setActionError(null);
    try {
      await onAddComment(character.id, commentText);
      setCommentText('');
    } catch {
      setActionError('Không thể gửi bình luận lúc này. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="mx-auto w-full max-w-5xl px-4 py-8 pb-24 sm:px-6 sm:py-12">
      {/* Back button to return cleanly from dedicated detail page */}
      <div className="mb-8">
        <button
          type="button"
          onMouseEnter={() => audioEngine.playHover()}
          onClick={() => {
            audioEngine.playNavigate();
            onBack();
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-[#421210]/70 bg-[#0a0404] px-3.5 py-2 text-xs font-medium text-[#dfd0cf] transition-colors hover:border-[#9e1b14] hover:text-white cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Quay lại danh sách</span>
        </button>
      </div>

      {/* Main Split Profile */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[320px_1fr] lg:gap-12 items-start">
        {/* Left: Full clarity Avatar Frame + Heart + Links */}
        <div className="perspective-stage flex flex-col items-center md:items-start">
          <div className="card-3d w-full max-w-[320px]">
            <AvatarFrame
              src={character.avatar}
              alt={character.name}
              dimmed={false}
              size="detail"
            />
          </div>

          <div className="mt-5 flex w-full max-w-[320px] items-center justify-between gap-3 rounded-xl border border-[#3d1110]/60 bg-[#080303] px-4 py-3">
            <button
              type="button"
              onMouseEnter={() => audioEngine.playHover()}
              onClick={handleHeart}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                isLiked
                  ? 'bg-[#8b1814] text-white'
                  : 'bg-[#140606] text-[#d6c5c4] hover:bg-[#2b0b09]'
              }`}
            >
              <Heart
                className={`h-4 w-4 ${isLiked ? 'fill-white text-white' : 'text-[#d6453a]'}`}
              />
              <span>{isLiked ? 'Đã thả tim' : 'Thả tim'}</span>
            </button>

            <span className="font-mono-num text-sm text-[#baa7a6]">
              {likes.length} lượt thích
            </span>
          </div>

          {/* Character Links */}
          {character.links.length > 0 && (
            <div className="mt-5 w-full max-w-[320px] rounded-xl border border-[#3d1110]/50 bg-[#070303] p-4">
              <p className="text-xs font-medium tracking-wider text-[#9c7977] uppercase">
                Liên kết liên quan
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {character.links.map((link, idx) => (
                  <a
                    key={`${link.url}-${idx}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={() => audioEngine.playHover()}
                    onClick={() => audioEngine.playClick()}
                    className="flex items-center justify-between rounded-lg border border-[#2b0c0b] bg-[#0d0505] px-3 py-2 text-xs font-medium text-[#e3d4d3] transition-colors hover:border-[#9e1b14] hover:text-white"
                  >
                    <span className="truncate">{link.label || link.url}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#c9382e]" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Name, Hashtag, Slogan, Lore, Comments */}
        <div className="min-w-0">
          {character.hashtags.length > 0 && (
            <p className="text-xs text-[#b5554e]">
              {character.hashtags.join(' · ')}
            </p>
          )}

          <h1 className="font-display title-dark-glow mt-2 text-4xl font-semibold tracking-tight sm:text-5xl text-balance">
            {character.name}
          </h1>

          {character.slogan.trim() && (
            <p className="mt-4 rounded-xl border border-[#3d1110]/50 bg-[#090303] px-4 py-3.5 text-base italic leading-relaxed text-[#e6d6d5]">
              “{character.slogan}”
            </p>
          )}

          {character.lore.trim() && (
            <div className="mt-8 border-t border-[#2a0b0a] pt-6">
              <h2 className="text-xs font-medium tracking-[0.18em] text-[#b3534d] uppercase">
                Cốt truyện
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-[#d1c3c2] sm:text-base sm:leading-8 whitespace-pre-line">
                {character.lore}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Full-Width Comments Section */}
      <section className="mt-12 border-t border-[#320d0c] pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2.5 text-base font-semibold text-[#f4eae9]">
            <MessageSquare className="h-4.5 w-4.5 text-[#c9382e]" />
            <span>Bình luận ({comments.length})</span>
          </h2>
          {!user && (
            <button
              type="button"
              onClick={() => {
                audioEngine.playClick();
                onRequestAuth();
              }}
              className="text-xs font-medium text-[#e05d52] hover:underline cursor-pointer"
            >
              Đăng nhập Google để bình luận
            </button>
          )}
        </div>

        {actionError && (
          <p className="mt-4 rounded-lg border border-[#7f1d1d] bg-[#1c0606] px-3.5 py-2.5 text-xs text-[#f0a5a0]">
            {actionError}
          </p>
        )}

        <form
          onSubmit={handleSubmitComment}
          className="mt-5 rounded-2xl border border-[#3d1110]/75 bg-[#080303] p-4 shadow-[0_12px_32px_rgba(0,0,0,0.65)] transition-colors focus-within:border-[#8b1814]"
        >
          <textarea
            ref={textareaRef}
            rows={3}
            maxLength={1000}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={
              user
                ? `Viết bình luận với tư cách ${user.name}... (nhấn Enter để xuống dòng)`
                : 'Đăng nhập Google để viết bình luận...'
            }
            className="min-h-[104px] w-full resize-y bg-transparent text-sm leading-relaxed text-[#f2e8e7] placeholder:text-[#756160] focus:outline-none"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#240908] pt-3">
            <span className="font-mono-num text-[11px] text-[#8a7574]">
              Enter để xuống dòng · {commentText.length}/1000
            </span>

            <button
              type="submit"
              disabled={submitting}
              onMouseEnter={() => audioEngine.playHover()}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#8b1814] px-4 text-xs font-medium text-white transition-colors hover:bg-[#a81f1a] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{submitting ? 'Đang gửi...' : 'Gửi bình luận'}</span>
            </button>
          </div>
        </form>

        <div className="mt-6 space-y-3.5">
          {comments.length === 0 ? (
            <div className="rounded-xl border border-[#2a0c0b]/70 bg-[#070303] px-5 py-8 text-center text-xs text-[#8f7978]">
              Chưa có bình luận nào. Hãy là người đầu tiên để lại dấu ấn.
            </div>
          ) : (
            comments.map((cmt) => {
              const canDelete = user && (user.isAdmin || user.id === cmt.userId);
              const initial = (cmt.userName.trim().charAt(0) || 'U').toUpperCase();
              return (
                <div
                  key={cmt.id}
                  className="rounded-xl border border-[#320e0d]/80 bg-[#070303] px-4 py-4 sm:px-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#4a1210] bg-[#140505] text-xs font-semibold text-[#e6b3ae]">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#f2e8e7]">
                          {cmt.userName}
                        </p>
                        <p className="font-mono-num text-[11px] text-[#85706f]">
                          {new Date(cmt.createdAt).toLocaleString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          audioEngine.playClick();
                          onDeleteComment(character.id, cmt.id);
                        }}
                        aria-label="Xóa bình luận"
                        className="shrink-0 rounded-md p-1.5 text-[#7d6968] hover:bg-[#1c0707] hover:text-[#e0564b] cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#ddd0cf] sm:text-[15px]">
                    {cmt.content}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </section>
    </article>
  );
}
