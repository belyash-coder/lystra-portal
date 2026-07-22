'use client';

import { useState } from 'react';

export function useAddMovie() {
  const [addingId, setAddingId] = useState<number | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  async function add(tmdbId: number): Promise<boolean> {
    setAddingId(tmdbId);
    try {
      const res = await fetch('/api/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdbId }),
      });
      if (res.ok) {
        setAddedIds((prev) => new Set(prev).add(tmdbId));
      }
      return res.ok;
    } finally {
      setAddingId(null);
    }
  }

  return { add, addingId, addedIds };
}
