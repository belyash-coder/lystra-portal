'use client'

import { useState, useTransition } from 'react'
import { toggleCollection } from '@/lib/actions/collection'

interface Props {
  itemId: string
  itemType: 'album' | 'artist' | 'release'
  initialAdded: boolean
}

export function AddToListenLaterButton({ itemId, itemType, initialAdded }: Props) {
  const [isAdded, setIsAdded] = useState(initialAdded)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(async () => {
      // Оптимистичный апдейт интерфейса (сразу меняем кнопку, не дожидаясь ответа)
      setIsAdded(!isAdded)

      const res = await toggleCollection(itemId, itemType, isAdded, 'listen_later')

      if (res?.error) {
        // Если сервер вернул ошибку, откатываем визуальное состояние обратно
        setIsAdded(isAdded)
        alert(res.error)
      }
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 border cursor-pointer ${
        isAdded
          ? 'bg-[#34d399] text-[#121212] border-[#34d399] hover:bg-opacity-90'
          : 'bg-transparent text-[#34d399] border-[#34d399] hover:bg-[#34d399] hover:text-[#121212]'
      } disabled:opacity-50`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </svg>
      {isPending ? 'Синхронизация...' : isAdded ? 'В списке "Послушать позже"' : 'Хочу послушать'}
    </button>
  )
}
