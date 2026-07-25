'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Eye, Trash2, Loader2 } from 'lucide-react';
import type { SharedListMovie } from '@/lib/types';

export function SharedMovieCard({
  movie,
  onToggleWatched,
  onRemove,
}: {
  movie: SharedListMovie;
  onToggleWatched: (movieId: string, watched: boolean) => Promise<void>;
  onRemove: (movieId: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function toggleWatched() {
    setBusy(true);
    try {
      await onToggleWatched(movie.movieId, !movie.watched);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Убрать «${movie.title}» из совместного списка?`)) return;
    setBusy(true);
    try {
      await onRemove(movie.movieId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex flex-col overflow-hidden rounded-xl bg-surface shadow-lg">
      <Link
        href={`/movie/${movie.movieId}`}
        className={`block aspect-[2/3] w-full bg-neutral-900 transition-all duration-700 ease-out ${
          movie.watched ? 'grayscale' : ''
        }`}
      >
        {movie.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={movie.posterUrl} alt={movie.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-text-muted">
            {movie.title}
          </div>
        )}
      </Link>
      {movie.watched && (
        <span className="animate-stamp-pop pointer-events-none absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-mint text-black shadow-lg">
          <Check size={18} strokeWidth={3} />
        </span>
      )}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight">{movie.title}</h3>
          <p className="text-xs text-text-muted">{movie.releaseYear ?? '—'}</p>
        </div>
        <div className="mt-auto flex gap-1.5">
          <button
            onClick={toggleWatched}
            disabled={busy}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-semibold disabled:opacity-60 ${
              movie.watched ? 'bg-surface-hover text-text-muted' : 'bg-mint text-black hover:bg-mint-hover'
            }`}
          >
            {busy ? <Loader2 className="animate-spin" size={14} /> : movie.watched ? <Check size={14} /> : <Eye size={14} />}
            {movie.watched ? 'Просмотрено' : 'Отметить'}
          </button>
          <button
            onClick={remove}
            disabled={busy}
            className="flex items-center justify-center rounded-full bg-surface-hover px-2.5 text-red-400 disabled:opacity-60"
            aria-label="Убрать из списка"
          >
            {busy ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
