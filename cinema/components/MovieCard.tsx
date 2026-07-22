'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trash2, Loader2 } from 'lucide-react';
import type { MovieWithEntry, WatchStatus } from '@/lib/types';
import { StatusSelect } from './StatusSelect';
import { RatingStars } from './RatingStars';

export function MovieCard({
  movie,
  onUpdate,
  onRemove,
}: {
  movie: MovieWithEntry;
  onUpdate: (movieId: string, patch: Partial<MovieWithEntry>) => void;
  onRemove?: (movieId: string) => void;
}) {
  const [removing, setRemoving] = useState(false);

  async function patchEntry(body: { status?: WatchStatus; rating?: number }) {
    onUpdate(movie.id, body);
    await fetch(`/api/movies/${movie.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async function handleRemove() {
    if (!confirm(`Удалить «${movie.title}» из библиотеки?`)) return;
    setRemoving(true);
    try {
      await fetch(`/api/movies/${movie.id}`, { method: 'DELETE' });
      onRemove?.(movie.id);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-surface shadow-lg">
      <Link href={`/movie/${movie.id}`} className="relative block aspect-[2/3] w-full bg-neutral-900">
        {movie.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={movie.posterUrl} alt={movie.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-text-muted">
            {movie.title}
          </div>
        )}
        {movie.tmdbRating != null && (
          <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-mint">
            {movie.tmdbRating.toFixed(1)}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <Link href={`/movie/${movie.id}`}>
            <h3 className="line-clamp-2 font-semibold leading-tight hover:text-lavender">{movie.title}</h3>
          </Link>
          <p className="text-xs text-text-muted">
            {movie.releaseYear ?? '—'}
            {movie.runtime ? ` · ${movie.runtime} мин` : ''}
          </p>
        </div>
        {movie.genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {movie.genres.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="rounded-md border border-lavender/30 px-1.5 py-0.5 text-[10px] text-text-muted"
              >
                {genre}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto flex flex-col gap-2 pt-1">
          <div className="flex gap-1.5">
            <div className="flex-1">
              <StatusSelect value={movie.status} onChange={(status) => patchEntry({ status })} />
            </div>
            <button
              onClick={handleRemove}
              disabled={removing}
              className="flex items-center justify-center rounded-lg bg-background px-2.5 text-red-400 hover:bg-surface-hover disabled:opacity-60"
              aria-label="Удалить из библиотеки"
            >
              {removing ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
            </button>
          </div>
          {movie.status === 'WATCHED' && (
            <RatingStars value={movie.rating} onChange={(rating) => patchEntry({ rating })} />
          )}
        </div>
      </div>
    </div>
  );
}
