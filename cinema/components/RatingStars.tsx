'use client';

import { Star } from 'lucide-react';

export function RatingStars({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (rating: number) => void;
}) {
  const filledStars = value ? Math.round(value / 2) : 0;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star * 2)}
          className="text-amber"
          aria-label={`Оценка ${star * 2} из 10`}
        >
          <Star size={16} fill={star <= filledStars ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}
