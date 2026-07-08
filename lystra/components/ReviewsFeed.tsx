'use client';

import { useState, useEffect } from 'react';
import { GlobalReviewCard } from './GlobalReviewCard';

interface ReviewsFeedProps {
  initialReviews: any[];
  currentUserId?: string;
  currentUserRole?: 'user' | 'moderator' | 'admin';
}

export function ReviewsFeed({ initialReviews, currentUserId, currentUserRole = 'user' }: ReviewsFeedProps) {
  const [reviews, setReviews] = useState(initialReviews);
  // Временно отключаем кнопку "загрузить еще", пока не сделаем API /api/reviews
  const [hasMore, setHasMore] = useState(false); 
  const [isLoading, setIsLoading] = useState(false);

  // TODO: Настроить Realtime подписку через новый бэкенд
  useEffect(() => {
    // Временно отключено
  }, []);

  const loadMore = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // TODO: Заменить на fetch к /api/reviews?offset=...
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
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