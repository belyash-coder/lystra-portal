'use client';

import { useState } from 'react';
import { UserPlus, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FollowArtistButtonProps {
  artistId: string;
  currentUserId: string;
}

export function FollowArtistButton({ artistId, currentUserId }: FollowArtistButtonProps) {
  const router = useRouter();
  
  // По умолчанию показываем, что не подписаны, так как функционал артистов удален
  const [isFollowing, setIsFollowing] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleFollow = async () => {
    if (isToggling) return;
    setIsToggling(true);

    try {
      console.warn('Подписка на артистов временно отключена (Supabase удален).');
      
      // Просто переключаем стейт локально для визуального отклика
      setIsFollowing(!isFollowing);
      
      router.refresh();
    } catch (error) {
      console.error('Ошибка при изменении статуса подписки:', error);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <button
      onClick={handleToggleFollow}
      disabled={isToggling}
      className={`flex items-center justify-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        isFollowing 
          ? 'bg-transparent text-white border border-zinc-700 hover:border-[#a78bfa] hover:text-[#a78bfa]' 
          : 'bg-[#a78bfa] text-[#121212] border border-[#a78bfa] hover:bg-opacity-90 hover:scale-105'
      }`}
    >
      {isFollowing ? (
        <>
          <UserCheck className="w-4 h-4" />
          Вы подписаны
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          Подписаться
        </>
      )}
    </button>
  );
}