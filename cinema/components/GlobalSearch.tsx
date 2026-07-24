'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, X } from 'lucide-react';
import { MEDIA_TYPE_LABELS, type TmdbListItem } from '@/lib/types';

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TmdbListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear results synchronously when query is cleared
      setResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => {
          setResults(data.results ?? []);
          setOpen(true);
        })
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function openAllResults() {
    if (!query.trim()) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  async function openItem(item: TmdbListItem) {
    setOpeningId(item.tmdbId);
    try {
      let movieId = item.libraryMovieId;
      if (!movieId) {
        const res = await fetch('/api/tmdb/catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tmdbId: item.tmdbId, mediaType: item.mediaType }),
        });
        if (!res.ok) return;
        const data = await res.json();
        movieId = data.movieId;
      }
      setOpen(false);
      setQuery('');
      router.push(`/movie/${movieId}`);
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          onKeyDown={(e) => e.key === 'Enter' && openAllResults()}
          placeholder="Поиск фильмов и сериалов..."
          className="w-full rounded-full border border-white/10 bg-surface py-2 pl-9 pr-9 text-sm focus:border-lavender focus:outline-none"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
            aria-label="Очистить"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-11 z-20 max-h-96 overflow-y-auto rounded-xl bg-surface shadow-xl">
          {searching ? (
            <div className="flex justify-center py-6 text-text-muted">
              <Loader2 className="animate-spin" size={18} />
            </div>
          ) : results.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-muted">Ничего не найдено</p>
          ) : (
            <>
              {results.map((item) => (
                <button
                  key={`${item.mediaType}-${item.tmdbId}`}
                  onClick={() => openItem(item)}
                  disabled={openingId === item.tmdbId}
                  className="flex w-full items-center gap-3 p-2 text-left hover:bg-surface-hover disabled:opacity-60"
                >
                  {item.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.posterUrl} alt="" className="h-14 w-10 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="h-14 w-10 shrink-0 rounded bg-neutral-800" />
                  )}
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="text-xs text-text-muted">
                      {MEDIA_TYPE_LABELS[item.mediaType]}
                      {item.releaseYear ? ` · ${item.releaseYear}` : ''}
                    </p>
                  </div>
                  {openingId === item.tmdbId && <Loader2 className="animate-spin text-text-muted" size={16} />}
                </button>
              ))}
              <button
                onClick={openAllResults}
                className="w-full border-t border-white/10 p-2.5 text-center text-sm font-medium text-lavender hover:bg-surface-hover"
              >
                Все результаты по «{query.trim()}» →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
