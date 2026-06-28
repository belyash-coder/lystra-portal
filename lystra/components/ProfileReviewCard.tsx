'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
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

export function ProfileReviewCard({ review }: { review: Review }) {
  const [isEditing, setIsEditing] = useState(false)
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
    <div className="bg-white/5 p-4 md:p-5 rounded-xl border border-transparent hover:border-[#a78bfa]/30 transition-colors flex flex-col gap-4 relative group">
      
      {/* Шапка отзыва: Обложка + Инфо */}
      <div className="flex gap-4 items-center">
        <div className="w-16 h-16 bg-neutral-800 rounded-lg shrink-0 overflow-hidden relative border border-white/10">
          {review.item_cover ? (
            <Image src={review.item_cover} alt={review.item_title || 'Обложка'} fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-500">Н/Д</div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="truncate pr-2">
              <h3 className="font-bold text-sm md:text-base text-white truncate">{review.item_title || 'Неизвестный релиз'}</h3>
              <p className="text-xs text-[#a78bfa] truncate">{review.item_artist || 'Неизвестный артист'}</p>
            </div>
            
            {/* Оценка (скрываем в режиме редактирования) */}
            {!isEditing && (
              <span className="bg-[#34d399]/10 text-[#34d399] font-bold px-2 py-1 rounded-md text-xs md:text-sm shrink-0">
                ★ {review.rating}/5
              </span>
            )}
          </div>
        </div>
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
          {review.review_text && (
            <p className="text-gray-300 text-xs md:text-sm line-clamp-4 bg-[#121212] p-3 rounded-lg border border-white/5 italic">
              "{review.review_text}"
            </p>
          )}
          
          <div className="flex justify-between items-center mt-auto pt-2">
            <span className="text-[10px] md:text-xs text-gray-500">
              {new Date(review.created_at).toLocaleDateString('ru-RU')}
            </span>

            {/* Кнопки Редактировать / Удалить (появляются при наведении) */}
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
          </div>
        </>
      )}

    </div>
  )
}