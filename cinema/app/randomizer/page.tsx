'use client';

import { useEffect, useMemo, useState } from 'react';
import { Shuffle, Loader2 } from 'lucide-react';
import { MovieCard } from '@/components/MovieCard';
import type { MovieList, MovieWithEntry } from '@/lib/types';

export default function RandomizerPage() {
  const [allMovies, setAllMovies] = useState<MovieWithEntry[]>([]);
  const [lists, setLists] = useState<MovieList[]>([]);
  const [genreFilter, setGenreFilter] = useState('ALL');
  const [listFilter, setListFilter] = useState('ALL');
  const [excludeWatched, setExcludeWatched] = useState(true);
  const [result, setResult] = useState<MovieWithEntry | null>(null);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [candidateCount, setCandidateCount] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    fetch('/api/movies')
      .then((res) => res.json())
      .then((data) => setAllMovies(data.movies ?? []));
    fetch('/api/lists')
      .then((res) => res.json())
      .then((data) => setLists(data.lists ?? []));
  }, []);

  const genres = useMemo(() => {
    const set = new Set<string>();
    allMovies.forEach((m) => m.genres.forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [allMovies]);

  async function spin(excludeCurrent = false) {
    setSpinning(true);
    const nextSeen = excludeCurrent && result ? [...seenIds, result.id] : seenIds;

    const params = new URLSearchParams();
    if (genreFilter !== 'ALL') params.set('genre', genreFilter);
    if (listFilter !== 'ALL') params.set('listId', listFilter);
    params.set('excludeWatched', String(excludeWatched));
    nextSeen.forEach((id) => params.append('exclude', id));

    try {
      const res = await fetch(`/api/randomizer?${params.toString()}`);
      const data = await res.json();
      setResult(data.movie);
      setCandidateCount(data.candidateCount ?? 0);
      setSeenIds(nextSeen);
    } finally {
      setSpinning(false);
    }
  }

  function reset() {
    setResult(null);
    setSeenIds([]);
    setCandidateCount(null);
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 flex items-center gap-2 text-xl font-bold text-lavender">
        <Shuffle size={22} />
        Рандомайзер
      </h1>

      <div className="mb-4 flex flex-col gap-3 rounded-xl bg-surface p-4">
        <label className="flex flex-col gap-1 text-sm">
          Жанр
          <select
            value={genreFilter}
            onChange={(e) => {
              setGenreFilter(e.target.value);
              reset();
            }}
            className="rounded-lg border border-white/10 bg-background px-3 py-2"
          >
            <option value="ALL">Любой</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </label>
        {lists.length > 0 && (
          <label className="flex flex-col gap-1 text-sm">
            Список
            <select
              value={listFilter}
              onChange={(e) => {
                setListFilter(e.target.value);
                reset();
              }}
              className="rounded-lg border border-white/10 bg-background px-3 py-2"
            >
              <option value="ALL">Вся библиотека</option>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={excludeWatched}
            onChange={(e) => {
              setExcludeWatched(e.target.checked);
              reset();
            }}
          />
          Не показывать посмотренные
        </label>
      </div>

      <button
        onClick={() => spin(false)}
        disabled={spinning || allMovies.length === 0}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-mint py-3 font-semibold text-black hover:bg-mint-hover disabled:opacity-50"
      >
        {spinning ? <Loader2 className="animate-spin" size={18} /> : <Shuffle size={18} />}
        Крутить
      </button>

      {allMovies.length === 0 && (
        <p className="mt-4 text-center text-sm text-text-muted">
          В библиотеке пока нет фильмов — добавьте что-нибудь на главной странице.
        </p>
      )}

      {result && (
        <div className="mt-6">
          <div className="mx-auto max-w-[240px]">
            <MovieCard
              movie={result}
              onUpdate={(id, patch) => setResult((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev))}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => spin(true)}
              className="flex-1 rounded-full bg-surface py-2 text-sm font-medium hover:bg-surface-hover"
            >
              Ещё раз
            </button>
            <button onClick={reset} className="flex-1 rounded-full bg-surface py-2 text-sm font-medium hover:bg-surface-hover">
              Сбросить
            </button>
          </div>
        </div>
      )}

      {result === null && candidateCount === 0 && (
        <p className="mt-6 text-center text-sm text-text-muted">
          Под такие фильтры ничего не подошло. Попробуйте изменить критерии.
        </p>
      )}
    </div>
  );
}
