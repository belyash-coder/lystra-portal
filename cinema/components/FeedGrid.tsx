'use client';

import { useEffect, useState } from 'react';
import { Loader2, SlidersHorizontal, X } from 'lucide-react';
import { TmdbResultCard } from './TmdbResultCard';
import type { FeedName, MediaType, TmdbListItem } from '@/lib/types';
import { CATALOG_SORT_LABELS, type CatalogSort, type TmdbGenre } from '@/lib/tmdb';

const fieldClass =
  'w-full min-w-0 rounded-lg border border-white/10 bg-background px-3 py-2 text-sm focus:border-lavender focus:outline-none';

interface Filters {
  genreId: string;
  yearFrom: string;
  yearTo: string;
  minRating: string;
  sort: CatalogSort;
}

const DEFAULT_FILTERS: Filters = { genreId: 'ALL', yearFrom: '', yearTo: '', minRating: '', sort: 'popularity' };

function countActive(f: Filters): number {
  let n = 0;
  if (f.genreId !== 'ALL') n++;
  if (f.yearFrom) n++;
  if (f.yearTo) n++;
  if (f.minRating) n++;
  if (f.sort !== 'popularity') n++;
  return n;
}

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
  const [panelOpen, setPanelOpen] = useState(false);
  const [applied, setApplied] = useState<Filters>(DEFAULT_FILTERS);
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS);

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
      if (applied.genreId !== 'ALL') params.set('genreId', applied.genreId);
      if (applied.yearFrom) params.set('yearFrom', applied.yearFrom);
      if (applied.yearTo) params.set('yearTo', applied.yearTo);
      if (applied.minRating) params.set('minRating', applied.minRating);
      params.set('sort', applied.sort);
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
  }, [feed, mediaType, applied]);

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

  function openPanel() {
    setDraft(applied);
    setPanelOpen(true);
  }

  function applyFilters() {
    setApplied(draft);
    setPanelOpen(false);
  }

  function resetFilters() {
    setDraft(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
    setPanelOpen(false);
  }

  const activeCount = countActive(applied);

  return (
    <div>
      {showFilters && (
        <div className="mb-4">
          <button
            onClick={panelOpen ? () => setPanelOpen(false) : openPanel}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium ${
              activeCount > 0 ? 'bg-lavender text-black' : 'bg-surface text-text-muted hover:bg-surface-hover'
            }`}
          >
            <SlidersHorizontal size={16} />
            Фильтры
            {activeCount > 0 && <span>· {activeCount}</span>}
          </button>

          {panelOpen && (
            <div className="mt-3 flex flex-col gap-2 rounded-xl bg-surface p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-semibold text-text-muted">Фильтры</span>
                <button onClick={() => setPanelOpen(false)} aria-label="Закрыть">
                  <X size={16} className="text-text-muted" />
                </button>
              </div>
              <select
                value={draft.genreId}
                onChange={(e) => setDraft({ ...draft, genreId: e.target.value })}
                className={fieldClass}
              >
                <option value="ALL">Все жанры</option>
                {genres.map((genre) => (
                  <option key={genre.id} value={genre.id}>
                    {genre.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={draft.yearFrom}
                  onChange={(e) => setDraft({ ...draft, yearFrom: e.target.value })}
                  placeholder="Год от"
                  className={fieldClass}
                />
                <input
                  type="number"
                  value={draft.yearTo}
                  onChange={(e) => setDraft({ ...draft, yearTo: e.target.value })}
                  placeholder="Год до"
                  className={fieldClass}
                />
              </div>
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={draft.minRating}
                onChange={(e) => setDraft({ ...draft, minRating: e.target.value })}
                placeholder="Мин. рейтинг"
                className={fieldClass}
              />
              <select
                value={draft.sort}
                onChange={(e) => setDraft({ ...draft, sort: e.target.value as CatalogSort })}
                className={fieldClass}
              >
                {Object.entries(CATALOG_SORT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <div className="mt-1 flex gap-2">
                <button
                  onClick={resetFilters}
                  className="flex-1 rounded-full bg-background py-2 text-sm font-medium hover:bg-surface-hover"
                >
                  Сбросить
                </button>
                <button
                  onClick={applyFilters}
                  className="flex-1 rounded-full bg-lavender py-2 text-sm font-semibold text-black hover:bg-lavender-hover"
                >
                  Применить
                </button>
              </div>
            </div>
          )}
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
