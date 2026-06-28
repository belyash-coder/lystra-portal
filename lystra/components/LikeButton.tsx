'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface LikeButtonProps {
  reviewId: string;
  initialIsLiked?: boolean;
  initialLikesCount?: number;
}

export function LikeButton({ reviewId, initialIsLiked = false, initialLikesCount = 0 }: LikeButtonProps) {
  const supabase = createClient();
  const router = useRouter();
  
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleLike = async () => {
    if (isLoading) return;
    
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Пожалуйста, войдите в аккаунт, чтобы ставить лайки.');
        setIsLoading(false);
        return;
      }

      // Оптимистичный UI: сразу переключаем состояние и меняем цифру
      const nextIsLiked = !isLiked;
      setIsLiked(nextIsLiked);
      setLikesCount(prev => nextIsLiked ? prev + 1 : prev - 1);

      if (isLiked) {
        // Убираем лайк из БД
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('review_id', reviewId)
          .eq('user_id', user.id);
          
        if (error) throw error;
      } else {
        // Добавляем лайк в БД
        const { error } = await supabase
          .from('likes')
          .insert({ review_id: reviewId, user_id: user.id });
          
        if (error) throw error;
      }
      
      router.refresh();

    } catch (error) {
      console.error('Ошибка при обработке лайка:', error);
      // Возвращаем как было, если сервер ответил ошибкой
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