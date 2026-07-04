'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { toggleReviewLike, submitComment } from '@/lib/actions/reviews'

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: {
    username: string | null
    avatar_url: string | null
  } | null
}

interface ReviewActionsProps {
  reviewId: string
  albumId: string
  initialLikesCount: number
  initialHasLiked: boolean
  initialCommentsCount: number
  currentUserId?: string
  comments: Comment[]
}

export function ReviewActions({
  reviewId,
  albumId,
  initialLikesCount,
  initialHasLiked,
  initialCommentsCount,
  currentUserId,
  comments
}: ReviewActionsProps) {
  const [likesCount, setLikesCount] = useState(initialLikesCount)
  const [hasLiked, setHasLiked] = useState(initialHasLiked)
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isLikePending, startLikeTransition] = useTransition()
  const [isCommentPending, startCommentTransition] = useTransition()

  const handleLike = () => {
    if (!currentUserId) {
      alert('Необходимо авторизоваться')
      return
    }
    
    setHasLiked(!hasLiked)
    setLikesCount(prev => hasLiked ? prev - 1 : prev + 1)

    startLikeTransition(async () => {
      const res = await toggleReviewLike(reviewId, albumId)
      if (res?.error) {
        setHasLiked(hasLiked)
        setLikesCount(likesCount)
        alert(res.error)
      }
    })
  }

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUserId) return alert('Необходимо авторизоваться')
    if (!commentText.trim()) return

    startCommentTransition(async () => {
      const res = await submitComment(reviewId, commentText, albumId)
      if (res?.error) {
        alert(res.error)
      } else {
        setCommentText('')
      }
    })
  }

  // Сортируем комменты по дате (старые вверху, новые внизу для удобства чтения диалога)
  const sortedComments = [...comments].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mt-3 pt-2 border-t border-white/5">
        <button 
          onClick={handleLike}
          disabled={isLikePending}
          className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer group/like py-1 ${
            hasLiked ? 'text-[#34d399]' : 'text-neutral-500 hover:text-[#34d399]'
          }`}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="15" 
            height="15" 
            viewBox="0 0 24 24" 
            fill={hasLiked ? 'currentColor' : 'none'} 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="group-hover/like:scale-110 transition-transform"
          >
            <path d="M7 10v12" />
            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h3l3.15-6.3a2.12 2.12 0 0 1 2.85-.83z" />
          </svg>
          <span>{likesCount}</span>
        </button>

        <button 
          onClick={() => setShowReplyForm(!showReplyForm)}
          className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer ml-auto group/reply py-1 font-medium ${
            showReplyForm ? 'text-[#a78bfa]' : 'text-neutral-400 hover:text-[#a78bfa]'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover/reply:translate-x-0.5 transition-transform">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>{initialCommentsCount > 0 ? `Ответов: ${initialCommentsCount}` : 'Ответить'}</span>
        </button>
      </div>

      {showReplyForm && (
        <div className="mt-4 space-y-4 pt-3 border-t border-white/5 animate-fadeIn">
          {/* Список существующих комментариев */}
          {sortedComments.length > 0 && (
            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
              {sortedComments.map((comment) => (
                <div key={comment.id} className="flex gap-3 bg-black/10 p-3 rounded-xl border border-white/5 items-start">
                  <Link href={`/profile/${comment.profiles?.username || comment.user_id}`} className="w-7 h-7 relative rounded-full overflow-hidden bg-neutral-800 flex-shrink-0 border border-white/10">
                    {comment.profiles?.avatar_url ? (
                      <Image src={comment.profiles.avatar_url} alt="avatar" fill className="object-cover" unoptimized />
                    ) : (
                      <span className="flex items-center justify-center w-full h-full text-[10px] font-bold text-[#a78bfa]">
                        {(comment.profiles?.username || 'U')[0].toUpperCase()}
                      </span>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <Link href={`/profile/${comment.profiles?.username || comment.user_id}`} className="text-xs font-bold text-white hover:text-[#a78bfa] transition-colors truncate">
                        @{comment.profiles?.username || 'user'}
                      </Link>
                      <span className="text-[9px] text-neutral-500 flex-shrink-0">
                        {new Date(comment.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 mt-1 whitespace-pre-wrap leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Форма отправки */}
          {currentUserId ? (
            <form onSubmit={handleSendComment} className="flex gap-2 items-end mt-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Написать ответ..."
                rows={1}
                disabled={isCommentPending}
                className="flex-1 bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#a78bfa] transition-colors resize-none min-h-[36px] max-h-[80px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendComment(e)
                  }
                }}
              />
              <button
                type="submit"
                disabled={isCommentPending || !commentText.trim()}
                className="bg-[#a78bfa] hover:bg-[#c4b5fd] disabled:bg-neutral-800 disabled:text-neutral-600 text-[#121212] font-bold px-4 py-2 rounded-xl text-xs transition-all flex-shrink-0 cursor-pointer h-[36px] flex items-center justify-center shadow-lg"
              >
                {isCommentPending ? '...' : 'Отправить'}
              </button>
            </form>
          ) : (
            <p className="text-xs text-neutral-500 text-center italic bg-white/5 py-2 rounded-xl border border-white/5">
              Войдите, чтобы оставлять ответы.
            </p>
          )}
        </div>
      )}
    </div>
  )
}