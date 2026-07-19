'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';

interface TmdbResult {
  tmdbId: number;
  title: string;
  originalTitle: string;
  posterUrl: string | null;
  releaseYear: number | null;
  tmdbRating: number | null;
}

export function AddMovieModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TmdbResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        .then((data) => setResults(data.results ?? []))
        .catch(() => setError('Не удалось выполнить поиск'))
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(timeout);
  }, [query]);

  async function addMovie(tmdbId: number) {
    setAddingId(tmdbId);
    setError(null);
    try {
      const res = await fetch('/api/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdbId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Не удалось добавить фильм');
      }
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-start justify-center bg-black/70 p-4 pt-16" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-surface p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Добавить фильм</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-main">
            <X size={20} />
          </button>
        </div>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Название фильма..."
          className="w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm focus:border-lavender focus:outline-none"
        />
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
          {searching && (
            <div className="flex items-center justify-center py-6 text-text-muted">
              <Loader2 className="animate-spin" size={20} />
            </div>
          )}
          {!searching &&
            results.map((movie) => (
              <div key={movie.tmdbId} className="flex items-center gap-3 rounded-lg bg-background p-2">
                {movie.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={movie.posterUrl} alt="" className="h-16 w-11 rounded object-cover" />
                ) : (
                  <div className="h-16 w-11 rounded bg-neutral-800" />
                )}
                <div className="flex-1 text-sm">
                  <p className="font-medium leading-tight">{movie.title}</p>
                  <p className="text-xs text-text-muted">{movie.releaseYear ?? '—'}</p>
                </div>
                <button
                  onClick={() => addMovie(movie.tmdbId)}
                  disabled={addingId === movie.tmdbId}
                  className="flex items-center gap-1 rounded-full bg-mint px-3 py-1.5 text-xs font-semibold text-black hover:bg-mint-hover disabled:opacity-50"
                >
                  {addingId === movie.tmdbId ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                  Добавить
                </button>
              </div>
            ))}
          {!searching && query.trim() && results.length === 0 && (
            <p className="py-4 text-center text-sm text-text-muted">Ничего не найдено</p>
          )}
        </div>
      </div>
    </div>
  );
}
