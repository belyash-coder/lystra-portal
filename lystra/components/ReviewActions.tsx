'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { toggleReviewLike, submitComment, deleteComment } from '@/lib/actions/reviews'

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  parent_id: string | null
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
  currentUserRole?: 'user' | 'moderator' | 'admin'
  comments: Comment[]
}

export function ReviewActions({
  reviewId,
  albumId,
  initialLikesCount,
  initialHasLiked,
  initialCommentsCount,
  currentUserId,
  currentUserRole = 'user',
  comments
}: ReviewActionsProps) {
  const [likesCount, setLikesCount] = useState(initialLikesCount)
  const [hasLiked, setHasLiked] = useState(initialHasLiked)
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null)
  
  // Стейт для отслеживания раскрытых веток комментариев
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({})
  
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
      const res = await submitComment(reviewId, commentText, albumId, replyingTo?.id)
      if (res?.error) {
        alert(res.error)
      } else {
        setCommentText('')
        
        // Если мы отвечали на комментарий, автоматически раскрываем эту ветку, чтобы увидеть свой ответ
        if (replyingTo?.id) {
          setExpandedThreads(prev => ({ ...prev, [replyingTo.id]: true }))
        }
        
        setReplyingTo(null)
      }
    })
  }

  const toggleThread = (commentId: string) => {
    setExpandedThreads(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }))
  }

  // Сортируем комменты по дате от старых к новым
  const sortedComments = [...comments].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  const getReplies = (parentId: string) => sortedComments.filter(c => c.parent_id === parentId)

  // Функция для рекурсивного рендеринга дерева комментариев
  const renderCommentTree = (parentId: string | null, depth = 0) => {
    const currentLevelComments = sortedComments.filter(c => c.parent_id === parentId)

    if (currentLevelComments.length === 0) return null

    return (
      <div className="space-y-3">
        {currentLevelComments.map((comment) => {
          const isReply = depth > 0
          const replies = getReplies(comment.id)
          const hasReplies = replies.length > 0
          const isExpanded = !!expandedThreads[comment.id]
          
          return (
            <div key={comment.id} className="w-full">
              {/* Карточка комментария */}
              <div className={`flex gap-3 bg-white/5 p-3 rounded-xl border border-white/5 items-start ${
                isReply ? 'ml-4 md:ml-6 pl-4 border-l-2 border-[#a78bfa]/35 bg-black/10' : ''
              }`}>
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
                  
                  {/* Панель действий под комментарием */}
                  <div className="flex items-center gap-4 mt-1.5">
                    {currentUserId && (
                      <button 
                        onClick={() => setReplyingTo({ id: comment.id, username: comment.profiles?.username || 'user' })}
                        className="text-[10px] text-neutral-500 hover:text-[#a78bfa] block cursor-pointer font-medium transition-colors"
                      >
                        Ответить
                      </button>
                    )}

                    {(currentUserRole === 'admin' || currentUserRole === 'moderator') && (
                      <button 
                        onClick={() => {
                          if(confirm('Точно удалить этот комментарий?')) {
                            startCommentTransition(async () => {
                              const res = await deleteComment(comment.id, albumId)
                              if (res?.error) alert(res.error)
                            })
                          }
                        }}
                        disabled={isCommentPending}
                        className="text-[10px] text-rose-500 hover:text-rose-400 block cursor-pointer font-medium transition-colors disabled:opacity-50"
                      >
                        Удалить
                      </button>
                    )}
                    
                    {hasReplies && (
                      <button
                        onClick={() => toggleThread(comment.id)}
                        className="text-[10px] text-[#a78bfa] hover:text-[#c4b5fd] font-bold transition-colors flex items-center gap-1"
                      >
                        {isExpanded ? 'Скрыть ответы' : `Показать ответы (${replies.length})`}
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="10" 
                          height="10" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                        >
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Вложенные ответы (рендерятся только если ветка раскрыта) */}
              {hasReplies && isExpanded && (
                <div className="mt-2 animate-fadeIn">
                  {renderCommentTree(comment.id, depth + 1)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

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
          onClick={() => {
            setShowReplyForm(!showReplyForm)
            setReplyingTo(null)
          }}
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
          {sortedComments.length > 0 && (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {renderCommentTree(null)}
            </div>
          )}

          {currentUserId ? (
            <form onSubmit={handleSendComment} className="flex flex-col gap-2 mt-2">
              {replyingTo && (
                <div className="flex items-center gap-2 bg-[#a78bfa]/10 border border-[#a78bfa]/20 px-2.5 py-1 rounded-lg w-fit text-[10px] text-[#a78bfa] font-bold animate-fadeIn">
                  <span>Ответ для @{replyingTo.username}</span>
                  <button 
                    type="button" 
                    onClick={() => setReplyingTo(null)}
                    className="hover:text-white cursor-pointer ml-1 font-black text-xs transition-colors"
                  >
                    ×
                  </button>
                </div>
              )}
              <div className="flex gap-2 items-end">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={replyingTo ? `Ваш ответ для @${replyingTo.username}...` : "Написать ответ в ветку..."}
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
              </div>
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