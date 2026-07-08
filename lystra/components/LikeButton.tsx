'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LikeButtonProps {
  reviewId: string;
  initialIsLiked?: boolean;
  initialLikesCount?: number;
}

export function LikeButton({ reviewId, initialIsLiked = false, initialLikesCount = 0 }: LikeButtonProps) {
  const router = useRouter();
  
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleLike = async () => {
    if (isLoading) return;
    
    setIsLoading(true);

    try {
      // Оптимистичный UI: сразу переключаем состояние и меняем цифру
      const nextIsLiked = !isLiked;
      setIsLiked(nextIsLiked);
      setLikesCount(prev => nextIsLiked ? prev + 1 : prev - 1);

      // ВАЖНО: Supabase удален. 
      // В будущем здесь нужно будет отправлять запрос на ваш новый API (Prisma + NextAuth)
      console.warn('Сохранение лайков в БД временно отключено (Supabase удален).');
      
      router.refresh();

    } catch (error) {
      console.error('Ошибка при обработке лайка:', error);
      // Возвращаем как было, если произошла ошибка
      setIsLiked(isLiked);
      setLikesCount(likesCount);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleLike}
      disabled={isLoading}
      className={`flex items-center gap-1.5 transition-all duration-200 active:scale-95 group/btn cursor-pointer ${
        isLiked 
          ? 'text-rose-400' // Мягкий, приглушенный красный
          : 'text-neutral-500 hover:text-rose-400/60' // Мягкое подсвечивание при наведении
      }`}
      title={isLiked ? 'Убрать лайк' : 'Поставить лайк'}
    >
      <Heart 
        className={`w-4 h-4 transition-all duration-200 ${
          isLiked ? 'fill-current' : 'fill-transparent group-hover/btn:scale-110'
        }`} 
      />
      
      <span className="text-xs font-semibold font-mono select-none">
        {likesCount}
      </span>
    </button>
  );
}