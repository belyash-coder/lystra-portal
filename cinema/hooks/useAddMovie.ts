'use client';

import { useState } from 'react';

export function useAddMovie() {
  const [addingId, setAddingId] = useState<number | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [movieIds, setMovieIds] = useState<Record<number, string>>({});

  async function add(tmdbId: number): Promise<string | null> {
    setAddingId(tmdbId);
    try {
      const res = await fetch('/api/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdbId }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const movieId = data.movie?.id as string | undefined;
      if (!movieId) return null;
      setAddedIds((prev) => new Set(prev).add(tmdbId));
      setMovieIds((prev) => ({ ...prev, [tmdbId]: movieId }));
      return movieId;
    } finally {
      setAddingId(null);
    }
  }

  return { add, addingId, addedIds, movieIds };
}
