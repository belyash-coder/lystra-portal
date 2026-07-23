'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { TmdbResultCard } from './TmdbResultCard';
import type { FeedName, MediaType, TmdbListItem } from '@/lib/types';

export function FeedGrid({ feed, mediaType }: { feed: FeedName; mediaType?: MediaType }) {
  const [items, setItems] = useState<TmdbListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  function load(nextPage: number) {
    const params = new URLSearchParams({ feed, page: String(nextPage) });
    if (mediaType) params.set('mediaType', mediaType);
    return fetch(`/api/tmdb/feed?${params.toString()}`).then((res) => res.json());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting pagination when feed/mediaType changes
    setItems([]);
    setPage(1);
    setHasMore(true);
    setLoading(true);
    load(1)
      .then((data) => {
        setItems(data.results ?? []);
        setHasMore(Boolean(data.hasMore));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed, mediaType]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await load(nextPage);
      setItems((prev) => [...prev, ...(data.results ?? [])]);
      setHasMore(Boolean(data.hasMore));
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-text-muted">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="py-16 text-center text-text-muted">Ничего не нашлось.</p>;
  }

  return (
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
  );
}
