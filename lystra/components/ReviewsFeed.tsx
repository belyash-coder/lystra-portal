'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { GlobalReviewCard } from './GlobalReviewCard';

interface ReviewsFeedProps {
  initialReviews: any[];
  currentUserId?: string;
  currentUserRole?: 'user' | 'moderator' | 'admin';
}

export function ReviewsFeed({ initialReviews, currentUserId, currentUserRole = 'user' }: ReviewsFeedProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [hasMore, setHasMore] = useState(initialReviews.length === 20);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  // Realtime подписка на появление новых отзывов в базе
  useEffect(() => {
    const channel = supabase
      .channel('public:reviews')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reviews' },
        async (payload) => {
          // Подтягиваем данные профиля для нового отзыва
          const { data: newReview } = await supabase
            .from('reviews')
            .select('*, profiles(username, avatar_url, role)')
            .eq('id', payload.new.id)
            .single();

          if (newReview) {
            setReviews((prev) => [newReview, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const loadMore = async () => {
    if (isLoading) return;
    setIsLoading(true);

    const { data } = await supabase
      .from('reviews')
      .select('*, profiles!user_id(username, avatar_url, role)')
      .order('created_at', { ascending: false })
      .range(reviews.length, reviews.length + 19);

    if (data && data.length > 0) {
      setReviews((prev) => [...prev, ...data]);
      if (data.length < 20) setHasMore(false);
    } else {
      setHasMore(false);
    }
    setIsLoading(false);
  };

  if (reviews.length === 0) {
    return (
      <div className="bg-white/5 border border-white/5 border-dashed p-12 rounded-2xl text-center">
        <p className="text-sm text-neutral-500">Пока никто не оставил ни одного отзыва. Будь первым!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {reviews.map((review) => (
          <GlobalReviewCard 
            key={review.id} 
            review={review} 
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        ))}
      </div>
      
      {hasMore && (
        <div className="flex justify-center mt-4">
          <button 
            onClick={loadMore}
            disabled={isLoading}
            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#a78bfa]/50 text-white text-sm font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Загрузка...' : 'Загрузить еще'}
          </button>
        </div>
      )}
    </div>
  );
}