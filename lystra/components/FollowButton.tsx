'use client'

import { useTransition } from 'react'
import { toggleFollow } from '@/lib/actions/social'
import { usePathname } from 'next/navigation'

interface FollowButtonProps {
  targetUserId: string
  initialIsFollowing: boolean
}

export function FollowButton({ targetUserId, initialIsFollowing }: FollowButtonProps) {
  const [isPending, startTransition] = useTransition()
  const pathname = usePathname()

  const handleFollow = () => {
    startTransition(async () => {
      try {
        await toggleFollow(targetUserId, pathname)
      } catch (error: any) {
        alert(error.message)
      }
    })
  }

  return (
    <button
      onClick={handleFollow}
      disabled={isPending}
      className={`px-6 py-2 rounded-full font-semibold text-sm transition-all cursor-pointer ${
        initialIsFollowing 
          ? 'bg-transparent border border-[#a78bfa] text-[#a78bfa] hover:bg-[#a78bfa]/10' 
          : 'bg-[#a78bfa] text-[#121212] hover:bg-opacity-90'
      } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isPending ? 'Загрузка...' : initialIsFollowing ? 'Отписаться' : 'Подписаться'}
    </button>
  )
}