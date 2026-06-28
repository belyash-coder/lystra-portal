'use client'

import { useState } from 'react'
import { submitReview } from '@/lib/actions/reviews'

interface ReviewFormProps {
  itemId: string;
  itemType: 'album' | 'track';
  itemTitle: string;
  itemArtist: string;
  itemCover: string;
}

export function ReviewForm({ itemId, itemType, itemTitle, itemArtist, itemCover }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [status, setStatus] = useState<{ success?: boolean; error?: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setStatus(null)

    const formData = new FormData(e.currentTarget)
    formData.append('itemId', itemId)
    formData.append('itemType', itemType)
    formData.append('rating', rating.toString())
    formData.append('itemTitle', itemTitle)
    formData.append('itemArtist', itemArtist)
    formData.append('itemCover', itemCover)

    try {
      const res = await submitReview(formData)
      if (res && res.error) {
        setStatus({ error: res.error })
      } else {
        setStatus({ success: true })
        const form = e.target as HTMLFormElement
        form.reset()
        setRating(0)
      }
    } catch (err) {
      setStatus({ error: 'Произошла непредвиденная ошибка при отправке' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form 
      onSubmit={handleSubmit} 
      className="space-y-4 p-6 bg-[#121212] rounded-xl border border-neutral-800"
    >
      <h3 className="text-lg font-semibold text-white">Оставить рецензию</h3>
      
      {/* Выбор оценки */}
      <div className="flex items-center gap-2">
        <span className="text-neutral-400 text-sm">Ваша оценка:</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`text-2xl transition-colors cursor-pointer focus:outline-none ${
                star <= rating ? 'text-[#a78bfa]' : 'text-neutral-700 hover:text-[#a78bfa]'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* Текст рецензии */}
      <textarea
        name="reviewText"
        placeholder="Поделитесь вашими мыслями о релизе..."
        rows={4}
        className="w-full p-3 rounded-lg bg-black/50 border border-neutral-800 text-white focus:outline-none focus:border-[#a78bfa] transition-colors resize-none text-sm placeholder-neutral-500"
      />

      {/* Кнопка и статус */}
      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={loading || rating === 0}
          className="px-5 py-2.5 rounded-lg bg-[#a78bfa] text-[#121212] font-semibold text-sm hover:bg-opacity-90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Публикация...' : 'Отправить'}
        </button>

        {status?.success && (
          <p className="text-[#34d399] text-sm font-medium animate-fade-in">
            Рецензия успешно опубликована!
          </p>
        )}
        {status?.error && (
          <p className="text-red-400 text-sm font-medium">
            {status.error}
          </p>
        )}
      </div>
    </form>
  )
}