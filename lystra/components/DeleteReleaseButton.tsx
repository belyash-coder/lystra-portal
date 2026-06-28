'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteReleaseRecord } from '../lib/actions/releases'
import { useRouter } from 'next/navigation'

interface Props {
  releaseId: string;
  title: string;
}

export default function DeleteReleaseButton({ releaseId, title }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    const confirmed = confirm(`Вы уверены, что хотите навсегда удалить релиз «${title}»?\n\nВсе треки и обложка будут стерты из хранилища без возможности восстановления.`)
    if (!confirmed) return

    setIsDeleting(true)
    try {
      // 1. Ждем подтверждения от базы данных
      await deleteReleaseRecord(releaseId)
      
      // 2. МГНОВЕННЫЙ ОТКЛИК: находим карточку и плавно растворяем её
      const card = document.getElementById(`release-${releaseId}`)
      if (card) {
        card.style.opacity = '0'
        setTimeout(() => card.remove(), 300) // удаляем из HTML через 300мс
      }
      
      // 3. Фоном обновляем кэш Next.js
      router.refresh() 
      
    } catch (error: any) {
      alert(error.message)
      setIsDeleting(false) 
    }
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all disabled:opacity-50"
      title="Удалить релиз"
    >
      {isDeleting ? <Loader2 className="w-5 h-5 animate-spin text-red-400" /> : <Trash2 className="w-5 h-5" />}
    </button>
  )
}