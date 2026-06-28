'use client'

import { useState, useTransition } from 'react'
import { toggleCollection } from '@/lib/actions/collection'

interface Props {
  itemId: string
  itemType: 'album' | 'artist'
  initialAdded: boolean
}

export function AddToCollectionButton({ itemId, itemType, initialAdded }: Props) {
  const [isAdded, setIsAdded] = useState(initialAdded)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(async () => {
      // Оптимистичный апдейт интерфейса (сразу меняем кнопку, не дожидаясь ответа)
      setIsAdded(!isAdded)
      
      const res = await toggleCollection(itemId, itemType, isAdded)
      
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
      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 border cursor-pointer ${
        isAdded 
          ? 'bg-[#a78bfa] text-[#121212] border-[#a78bfa] hover:bg-opacity-90' 
          : 'bg-transparent text-[#a78bfa] border-[#a78bfa] hover:bg-[#a78bfa] hover:text-[#121212]'
      } disabled:opacity-50`}
    >
      {isPending ? 'Синхронизация...' : isAdded ? 'В коллекции' : 'Добавить в коллекцию'}
    </button>
  )
}