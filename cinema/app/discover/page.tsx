'use client';

import { useEffect, useState } from 'react';
import { Compass, Loader2 } from 'lucide-react';
import { TmdbResultCard } from '@/components/TmdbResultCard';
import { DISCOVER_LABELS, type TmdbListItem } from '@/lib/types';
import { DISCOVER_CATEGORIES, type DiscoverCategory } from '@/lib/tmdb';

export default function DiscoverPage() {
  const [category, setCategory] = useState<DiscoverCategory>('popular');
  const [items, setItems] = useState<TmdbListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch triggered on category change
    setLoading(true);
    fetch(`/api/tmdb/discover?category=${category}`)
      .then((res) => res.json())
      .then((data) => setItems(data.results ?? []))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div>
      <h1 className="mb-4 flex items-center gap-2 text-xl font-bold text-lavender">
        <Compass size={22} />
        Обзор
      </h1>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {DISCOVER_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
              category === c ? 'bg-lavender text-black' : 'bg-surface text-text-muted hover:bg-surface-hover'
            }`}
          >
            {DISCOVER_LABELS[c]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-text-muted">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <TmdbResultCard key={item.tmdbId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
