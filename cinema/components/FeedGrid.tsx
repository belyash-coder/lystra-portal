'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { TmdbResultCard } from './TmdbResultCard';
import type { FeedName, MediaType, TmdbListItem } from '@/lib/types';
import { CATALOG_SORT_LABELS, type CatalogSort, type TmdbGenre } from '@/lib/tmdb';

const fieldClass =
  'w-full min-w-0 rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm focus:border-lavender focus:outline-none';

export function FeedGrid({
  feed,
  mediaType,
  showFilters = true,
}: {
  feed: FeedName;
  mediaType?: MediaType;
  showFilters?: boolean;
}) {
  const [items, setItems] = useState<TmdbListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [genres, setGenres] = useState<TmdbGenre[]>([]);
  const [genreId, setGenreId] = useState('ALL');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [minRating, setMinRating] = useState('');
  const [sort, setSort] = useState<CatalogSort>('popularity');

  useEffect(() => {
    if (!showFilters) return;
    const genreMediaType = mediaType === 'tv' ? 'tv' : 'movie';
    fetch(`/api/tmdb/genres?mediaType=${genreMediaType}`)
      .then((res) => res.json())
      .then((data) => setGenres(data.genres ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed, mediaType]);

  function buildParams(targetPage: number) {
    const params = new URLSearchParams({ feed, page: String(targetPage) });
    if (mediaType) params.set('mediaType', mediaType);
    if (showFilters) {
      if (genreId !== 'ALL') params.set('genreId', genreId);
      if (yearFrom) params.set('yearFrom', yearFrom);
      if (yearTo) params.set('yearTo', yearTo);
      if (minRating) params.set('minRating', minRating);
      params.set('sort', sort);
    }
    return params;
  }

  function load(targetPage: number) {
    return fetch(`/api/tmdb/feed?${buildParams(targetPage).toString()}`).then((res) => res.json());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting pagination when feed/filters change
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
  }, [feed, mediaType, genreId, yearFrom, yearTo, minRating, sort]);

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

  return (
    <div>
      {showFilters && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <select value={genreId} onChange={(e) => setGenreId(e.target.value)} className={`${fieldClass} sm:w-40`}>
            <option value="ALL">Все жанры</option>
            {genres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={yearFrom}
            onChange={(e) => setYearFrom(e.target.value)}
            placeholder="Год от"
            className={`${fieldClass} sm:w-28`}
          />
          <input
            type="number"
            value={yearTo}
            onChange={(e) => setYearTo(e.target.value)}
            placeholder="Год до"
            className={`${fieldClass} sm:w-28`}
          />
          <input
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            placeholder="Мин. рейтинг"
            className={`${fieldClass} sm:w-32`}
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as CatalogSort)}
            className={`${fieldClass} sm:w-44`}
          >
            {Object.entries(CATALOG_SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
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
