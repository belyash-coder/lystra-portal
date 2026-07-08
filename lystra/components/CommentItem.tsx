'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
// Импортируем наши готовые функции из бэкенда
import { updateReviewComment, deleteReviewComment, reportComment } from '@/lib/actions/social'

interface CommentProps {
  id: string
  content: string
  authorName: string
  isOwner: boolean 
}

export function CommentItem({ id, content, authorName, isOwner }: CommentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(content)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname() // Узнаем текущую страницу для обновления кэша

  // 1. Реальное сохранение (Редактирование)
  const handleSave = async () => {
    try {
      await updateReviewComment(id, editValue, pathname || '')
      setIsEditing(false)
    } catch (error: any) {
      alert('Ошибка при сохранении: ' + error.message)
    }
  }

  // 2. Реальное удаление
  const handleDelete = async () => {
    if (confirm('Точно удалить комментарий?')) {
      try {
        await deleteReviewComment(id, pathname || '')
      } catch (error: any) {
        alert('Ошибка при удалении: ' + error.message)
      }
    }
  }

  // 3. Реальная жалоба
  const handleReport = async () => {
    try {
      await reportComment(id)
      alert('Жалоба успешно отправлена модераторам')
    } catch (error: any) {
      alert(error.message) // Если юзер уже жаловался, выведет текст ошибки из бэкенда
    } finally {
      setIsMenuOpen(false)
    }
  }

  return (
    <div className="group relative flex gap-3 p-3 bg-[#121212] rounded-lg border border-neutral-800/50 hover:border-neutral-800 transition-colors">
      
      {/* Аватарка (пока заглушка) */}
      <div className="w-8 h-8 rounded-full bg-neutral-800 flex-shrink-0" />

      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-medium text-white text-sm">
            {authorName} {isOwner && <span className="text-neutral-500 text-xs ml-2">(Вы)</span>}
          </span>
          
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-neutral-500 hover:text-[#a78bfa] px-2 cursor-pointer transition-colors"
          >
            •••
          </button>
        </div>

        {/* Выпадающее меню */}
        {isMenuOpen && (
          <div className="absolute top-10 right-2 bg-[#1a1a1a] border border-neutral-800 rounded-md shadow-xl py-1 z-10 w-40 text-sm">
            {isOwner ? (
              <>
                <button 
                  onClick={() => { setIsEditing(true); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-white hover:bg-neutral-800 cursor-pointer"
                >
                  Редактировать
                </button>
                <button 
                  onClick={handleDelete}
                  className="w-full text-left px-4 py-2 text-red-400 hover:bg-neutral-800 cursor-pointer"
                >
                  Удалить
                </button>
              </>
            ) : (
              <button 
                onClick={handleReport}
                className="w-full text-left px-4 py-2 text-neutral-300 hover:bg-neutral-800 cursor-pointer"
              >
                Пожаловаться
              </button>
            )}
          </div>
        )}

        {/* Тело комментария */}
        {isEditing ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full p-2 text-sm bg-black/50 border border-[#a78bfa] rounded text-white focus:outline-none resize-none"
              rows={2}
            />
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => { setIsEditing(false); setEditValue(content); }}
                className="px-3 py-1 text-xs text-neutral-400 hover:text-white cursor-pointer"
              >
                Отмена
              </button>
              <button 
                onClick={handleSave}
                className="px-3 py-1 text-xs bg-[#a78bfa] text-[#121212] rounded font-medium cursor-pointer"
              >
                Сохранить
              </button>
            </div>
          </div>
        ) : (
          <p className="text-neutral-300 text-sm mt-1">{content}</p>
        )}
      </div>
    </div>
  )
}