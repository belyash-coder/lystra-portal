'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { UserPlus, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FollowArtistButtonProps {
  artistId: string;
  currentUserId: string;
}

export function FollowArtistButton({ artistId, currentUserId }: FollowArtistButtonProps) {
  const supabase = createClient();
  const router = useRouter();
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    const checkFollowStatus = async () => {
      const { data, error } = await supabase
        .from('follows') // Замените на 'follows' или 'followers', если таблица называется иначе
        .select('*')
        .eq('follower_id', currentUserId)
        .eq('following_id', artistId)
        .single();

      if (data) {
        setIsFollowing(true);
      }
      setIsLoading(false);
    };
    
    checkFollowStatus();
  }, [artistId, currentUserId, supabase]);

  const handleToggleFollow = async () => {
    if (isToggling) return;
    setIsToggling(true);

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follow') 
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', artistId);
          
        if (!error) {
          setIsFollowing(false);
        } else {
          alert('Ошибка при отписке (проверьте политики RLS в Supabase): ' + error.message);
        }
      } else {
        const { error } = await supabase
          .from('follow') 
          .insert({ 
            follower_id: currentUserId, 
            following_id: artistId 
          });
          
        if (!error) {
          setIsFollowing(true);
        } else {
          alert('Ошибка при подписке: ' + error.message);
        }
      }
      
      // Обновляем кэш, чтобы лента подхватила изменения
      router.refresh();
    } catch (error) {
      console.error('Ошибка при изменении статуса подписки:', error);
    } finally {
      setIsToggling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-36 h-10 bg-zinc-800/50 rounded-full animate-pulse border border-zinc-800"></div>
    );
  }

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