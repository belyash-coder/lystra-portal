'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { deleteReview } from '@/lib/actions/reviews'

interface ReviewWithProfile {
  id: string
  item_id: string
  item_type: string
  item_title: string | null
  item_artist: string | null
  item_cover: string | null
  review_text: string | null
  rating: number
  created_at: string
  user_id: string
  profiles: {
    username: string | null
    avatar_url: string | null
    role: 'user' | 'moderator' | 'admin'
  } | null
}

interface GlobalReviewCardProps {
  review: ReviewWithProfile
  currentUserId?: string
  currentUserRole?: 'user' | 'moderator' | 'admin'
}

export function GlobalReviewCard({ review, currentUserId, currentUserRole = 'user' }: GlobalReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isOwner = currentUserId === review.user_id
  const canDelete = isOwner || currentUserRole === 'admin' || currentUserRole === 'moderator'

  const handleDelete = () => {
    if (!confirm('Вы уверены, что хотите удалить этот отзыв?')) return

    startTransition(async () => {
      const res = await deleteReview(review.id)
      if (res?.error) alert(res.error)
    })
  }

  const profile = review.profiles

  return (
    <div className="bg-gradient-to-br from-white/5 to-transparent p-5 rounded-2xl border border-white/10 hover:border-[#a78bfa]/40 hover:shadow-[0_8px_24px_rgba(167,139,250,0.1)] transition-all duration-300 flex flex-col gap-4 relative group backdrop-blur-sm">
      
      {/* Шапка: Автор отзыва */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/5">
        <Link href={`/profile/${profile?.username || review.user_id}`} className="flex items-center gap-2.5 group/author">
          <div className="w-8 h-8 relative rounded-full overflow-hidden bg-neutral-800 border border-white/10 shrink-0">
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt="avatar" fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[#34d399]">
                {profile?.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <span className="text-xs font-bold text-neutral-200 group-hover/author:text-[#34d399] transition-colors">
            @{profile?.username || 'user'}
          </span>
        </Link>

        {profile?.role === 'admin' && (
          <span className="px-2 py-0.5 bg-rose-500/20 text-rose-500 border border-rose-500/30 text-[9px] rounded-md font-bold uppercase tracking-wider shadow-[0_0_8px_rgba(244,63,94,0.1)]">Admin</span>
        )}
        {profile?.role === 'moderator' && (
          <span className="px-2 py-0.5 bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[9px] rounded-md font-bold uppercase tracking-wider shadow-[0_0_8px_rgba(56,189,248,0.1)]">Mod</span>
        )}
      </div>

      {/* Тело: Обложка релиза + информация */}
      <div className="flex justify-between items-center gap-4">
        <Link href={`/album/${review.item_id}`} className="flex gap-4 items-center flex-1 min-w-0 group/link cursor-pointer">
          <div className="w-16 h-16 bg-neutral-800 rounded-xl shrink-0 overflow-hidden relative border border-white/10 shadow-md group-hover/link:border-[#34d399]/50 transition-all duration-300">
            {review.item_cover ? (
              <Image src={review.item_cover} alt={review.item_title || 'Обложка'} fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-500">Н/Д</div>
            )}
          </div>
          
          <div className="truncate pr-2">
            <h3 className="font-bold text-sm text-white truncate group-hover/link:text-[#34d399] transition-colors">{review.item_title || 'Неизвестный релиз'}</h3>
            <p className="text-xs text-[#a78bfa] truncate group-hover/link:text-[#c4b5fd] transition-colors">{review.item_artist || 'Неизвестный артист'}</p>
          </div>
        </Link>
        
        <div className="bg-[#34d399]/10 border border-[#34d399]/30 text-[#34d399] font-bold px-2.5 py-1 rounded-lg text-xs shrink-0 flex items-center gap-1 self-start mt-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" /></svg>
          {review.rating}
        </div>
      </div>

      {/* Текст отзыва с ограничением по высоте */}
      {review.review_text && (
        <div className="relative mt-1">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#a78bfa] to-[#34d399] rounded-l-md opacity-70"></div>
          <p className={`text-gray-300 text-xs md:text-sm bg-black/20 py-3 pr-3 pl-4 rounded-r-lg italic relative whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
            "{review.review_text}"
          </p>
        </div>
      )}

      {/* Подвал: Дата и Модерация */}
      <div className="flex justify-between items-center mt-auto pt-1">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500">
            {new Date(review.created_at).toLocaleDateString('ru-RU')}
          </span>
          {review.review_text && review.review_text.length > 140 && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[10px] font-medium text-[#a78bfa] hover:text-[#34d399] transition-colors cursor-pointer"
            >
              {isExpanded ? 'Скрыть' : 'Читать полностью'}
            </button>
          )}
        </div>

        {canDelete && (
          <div className="flex gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="text-xs text-neutral-400 hover:text-rose-500 font-medium cursor-pointer transition-colors disabled:opacity-50"
            >
              Удалить
            </button>
          </div>
        )}
      </div>

    </div>
  )
}