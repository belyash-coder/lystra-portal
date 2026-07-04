'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { deleteReview, submitReview } from '@/lib/actions/reviews'

interface Review {
  id: string
  item_id: string
  item_type: string
  item_title: string | null
  item_artist: string | null
  item_cover: string | null
  review_text: string | null
  rating: number
  created_at: string
}

export function ProfileReviewCard({ review, isOwner = false }: { review: Review, isOwner?: boolean }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [rating, setRating] = useState(review.rating)
  const [reviewText, setReviewText] = useState(review.review_text || '')
  const [isPending, startTransition] = useTransition()

  // Удаление отзыва
  const handleDelete = () => {
    if (!confirm('Вы уверены, что хотите удалить этот отзыв?')) return

    startTransition(async () => {
      const res = await deleteReview(review.id)
      if (res?.error) alert(res.error)
    })
  }

  // Сохранение отредактированного отзыва
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const formData = new FormData()
      formData.append('itemId', review.item_id)
      formData.append('itemType', review.item_type)
      formData.append('rating', rating.toString())
      formData.append('reviewText', reviewText)
      formData.append('itemTitle', review.item_title || '')
      formData.append('itemArtist', review.item_artist || '')
      formData.append('itemCover', review.item_cover || '')

      const res = await submitReview(formData)
      if (res?.error) {
        alert(res.error)
      } else {
        setIsEditing(false)
      }
    })
  }

  return (
    <div className="bg-gradient-to-br from-white/5 to-transparent p-4 md:p-5 rounded-2xl border border-white/10 hover:border-[#a78bfa]/40 hover:shadow-[0_8px_24px_rgba(167,139,250,0.1)] transition-all duration-300 flex flex-col gap-4 relative group backdrop-blur-sm">
      
      {/* Шапка отзыва: Обложка + Инфо */}
      <div className="flex justify-between items-center gap-4">
        <Link href={`/album/${review.item_id}`} className="flex gap-4 items-center flex-1 min-w-0 group/link cursor-pointer">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-neutral-800 rounded-xl shrink-0 overflow-hidden relative border border-white/10 shadow-md group-hover:shadow-[0_0_15px_rgba(52,211,153,0.2)] group-hover/link:border-[#34d399]/50 transition-all duration-300">
            {review.item_cover ? (
              <Image src={review.item_cover} alt={review.item_title || 'Обложка'} fill className="object-cover group-hover/link:scale-105 transition-transform duration-500" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-500">Н/Д</div>
            )}
          </div>
          
          <div className="truncate pr-2">
            <h3 className="font-bold text-sm md:text-base text-white truncate group-hover/link:text-[#34d399] transition-colors">{review.item_title || 'Неизвестный релиз'}</h3>
            <p className="text-xs text-[#a78bfa] truncate group-hover/link:text-[#c4b5fd] transition-colors">{review.item_artist || 'Неизвестный артист'}</p>
          </div>
        </Link>
        
        {/* Оценка (скрываем в режиме редактирования) */}
        {!isEditing && (
          <div className="bg-[#34d399]/10 border border-[#34d399]/30 text-[#34d399] font-bold px-2.5 py-1 rounded-lg text-xs md:text-sm shrink-0 flex items-center gap-1 shadow-[0_0_10px_rgba(52,211,153,0.1)] self-start mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 md:w-4 md:h-4 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]"><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" /></svg>
            {review.rating}
          </div>
        )}
      </div>

      {/* === РЕЖИМ РЕДАКТИРОВАНИЯ === */}
      {isEditing ? (
        <form onSubmit={handleSave} className="space-y-3 mt-2">
          {/* Интерактивные звезды */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-neutral-400 mr-1">Оценка:</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-xl cursor-pointer transition-colors ${
                  star <= rating ? 'text-[#a78bfa]' : 'text-neutral-600 hover:text-[#a78bfa]'
                }`}
              >
                ★
              </button>
            ))}
          </div>

          {/* Поле ввода текста */}
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={3}
            className="w-full p-2.5 rounded-lg bg-[#121212] border border-neutral-800 text-white text-xs md:text-sm focus:outline-none focus:border-[#a78bfa] resize-none"
            placeholder="Ваш измененный отзыв..."
          />

          {/* Кнопки управления */}
          <div className="flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setRating(review.rating)
                setReviewText(review.review_text || '')
              }}
              className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-white font-medium cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-3 py-1.5 rounded bg-[#34d399] text-[#121212] font-semibold hover:bg-opacity-90 cursor-pointer disabled:opacity-50"
            >
              {isPending ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      ) : (
        /* === РЕЖИМ ПРОСМОТРА === */
        <>
          {review.review_text && isExpanded && (
            <div className="relative mt-1 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#a78bfa] to-[#34d399] rounded-l-md opacity-70"></div>
              <p className="text-gray-300 text-xs md:text-sm bg-black/20 py-3 pr-3 pl-4 rounded-r-lg italic relative text-pretty whitespace-pre-wrap">
                "{review.review_text}"
              </p>
            </div>
          )}
          
          <div className="flex justify-between items-center mt-auto pt-2">
            <div className="flex items-center gap-3">
              <span className="text-[10px] md:text-xs text-gray-500">
                {new Date(review.created_at).toLocaleDateString('ru-RU')}
              </span>
              {review.review_text && (
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-[10px] md:text-xs font-medium text-[#a78bfa] hover:text-[#34d399] transition-colors cursor-pointer"
                >
                  {isExpanded ? 'Скрыть текст' : 'Читать отзыв'}
                </button>
              )}
            </div>

            {/* Кнопки Редактировать / Удалить (только для владельца) */}
            {isOwner && (
              <div className="flex gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-neutral-400 hover:text-[#a78bfa] font-medium cursor-pointer transition-colors"
                >
                  Редактировать
                </button>
                <span className="text-neutral-700">|</span>
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="text-xs text-neutral-400 hover:text-red-400 font-medium cursor-pointer transition-colors disabled:opacity-50"
                >
                  Удалить
                </button>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  )
}