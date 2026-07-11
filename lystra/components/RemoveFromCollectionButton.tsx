'use client'

import { useTransition } from 'react'
import { toggleCollection } from '@/lib/actions/collection'

interface Props {
  itemId: string
  itemType?: string
  listType?: string
}

export function RemoveFromCollectionButton({ itemId, itemType = 'album', listType = 'collection' }: Props) {
  const [isPending, startTransition] = useTransition()

  const handleRemove = (e: React.MouseEvent) => {
    // Предотвращаем переход по ссылке Link, в которую будет вложена карточка
    e.preventDefault()
    e.stopPropagation()

    startTransition(async () => {
      const res = await toggleCollection(itemId, itemType, true, listType) // true запускает удаление из БД
      if (res?.error) {
        alert(res.error)
      }
    })
  }

  return (
    <button
      onClick={handleRemove}
      disabled={isPending}
      className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/70 text-neutral-400 hover:text-red-400 md:opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer backdrop-blur-sm shadow-md disabled:opacity-50"
      title={listType === 'listen_later' ? 'Убрать из списка "Послушать позже"' : 'Удалить из коллекции'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
        stroke="currentColor"
        className="w-3.5 h-3.5"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}
