'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { TmdbResultCard } from './TmdbResultCard';
import type { TmdbListItem } from '@/lib/types';

export function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';

  const [items, setItems] = useState<TmdbListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset results when the query changes
    setItems([]);
    setPage(1);
    setHasMore(false);

    if (!query.trim()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}&page=1`)
      .then((res) => res.json())
      .then((data) => {
        setItems(data.results ?? []);
        setHasMore(Boolean(data.hasMore));
      })
      .finally(() => setLoading(false));
  }, [query]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}&page=${nextPage}`);
      const data = await res.json();
      setItems((prev) => [...prev, ...(data.results ?? [])]);
      setHasMore(Boolean(data.hasMore));
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-lavender">
        {query.trim() ? `Результаты по запросу «${query}»` : 'Поиск'}
      </h1>

      {!query.trim() ? (
        <p className="py-16 text-center text-text-muted">Введите запрос в поиске сверху.</p>
      ) : loading ? (
        <div className="flex justify-center py-16 text-text-muted">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : items.length === 0 ? (
        <p className="py-16 text-center text-text-muted">Ничего не нашлось.</p>
      ) : (
        <div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((item) => (
              <TmdbResultCard key={`${item.mediaType}-${item.tmdbId}`} item={item} />
            ))}
          </div>
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 rounded-full bg-surface px-6 py-2.5 text-sm font-medium hover:bg-surface-hover disabled:opacity-60"
              >
                {loadingMore && <Loader2 className="animate-spin" size={16} />}
                Ещё
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
