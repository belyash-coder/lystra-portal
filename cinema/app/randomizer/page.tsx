'use client';

import { useEffect, useMemo, useState } from 'react';
import { Shuffle, Loader2 } from 'lucide-react';
import { MovieCard } from '@/components/MovieCard';
import { TmdbResultCard } from '@/components/TmdbResultCard';
import { useAddMovie } from '@/hooks/useAddMovie';
import type { MovieList, MovieWithEntry, TmdbListItem } from '@/lib/types';
import type { TmdbGenre } from '@/lib/tmdb';

type Source = 'library' | 'tmdb';

export default function RandomizerPage() {
  const [source, setSource] = useState<Source>('library');

  const [allMovies, setAllMovies] = useState<MovieWithEntry[]>([]);
  const [lists, setLists] = useState<MovieList[]>([]);
  const [genreFilter, setGenreFilter] = useState('ALL');
  const [listFilter, setListFilter] = useState('ALL');
  const [excludeWatched, setExcludeWatched] = useState(true);
  const [result, setResult] = useState<MovieWithEntry | null>(null);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [candidateCount, setCandidateCount] = useState<number | null>(null);

  const [tmdbGenres, setTmdbGenres] = useState<TmdbGenre[]>([]);
  const [tmdbGenreId, setTmdbGenreId] = useState('ALL');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [minRating, setMinRating] = useState('');
  const [tmdbResult, setTmdbResult] = useState<TmdbListItem | null>(null);
  const [tmdbNotFound, setTmdbNotFound] = useState(false);
  const { add, addingId, addedIds } = useAddMovie();

  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    fetch('/api/movies')
      .then((res) => res.json())
      .then((data) => setAllMovies(data.movies ?? []));
    fetch('/api/lists')
      .then((res) => res.json())
      .then((data) => setLists(data.lists ?? []));
    fetch('/api/tmdb/genres')
      .then((res) => res.json())
      .then((data) => setTmdbGenres(data.genres ?? []));
  }, []);

  const genres = useMemo(() => {
    const set = new Set<string>();
    allMovies.forEach((m) => m.genres.forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [allMovies]);

  async function spinLibrary(excludeCurrent = false) {
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

  async function spinTmdb() {
    setSpinning(true);
    const params = new URLSearchParams();
    if (tmdbGenreId !== 'ALL') params.set('genreId', tmdbGenreId);
    if (yearFrom) params.set('yearFrom', yearFrom);
    if (yearTo) params.set('yearTo', yearTo);
    if (minRating) params.set('minRating', minRating);

    try {
      const res = await fetch(`/api/tmdb/random?${params.toString()}`);
      const data = await res.json();
      setTmdbResult(data.movie ?? null);
      setTmdbNotFound(!data.movie);
    } finally {
      setSpinning(false);
    }
  }

  function reset() {
    setResult(null);
    setSeenIds([]);
    setCandidateCount(null);
    setTmdbResult(null);
    setTmdbNotFound(false);
  }

  function switchSource(next: Source) {
    setSource(next);
    reset();
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 flex items-center gap-2 text-xl font-bold text-lavender">
        <Shuffle size={22} />
        Рандомайзер
      </h1>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => switchSource('library')}
          className={`flex-1 rounded-full py-2 text-sm font-medium ${
            source === 'library' ? 'bg-lavender text-black' : 'bg-surface text-text-muted hover:bg-surface-hover'
          }`}
        >
          Моя библиотека
        </button>
        <button
          onClick={() => switchSource('tmdb')}
          className={`flex-1 rounded-full py-2 text-sm font-medium ${
            source === 'tmdb' ? 'bg-lavender text-black' : 'bg-surface text-text-muted hover:bg-surface-hover'
          }`}
        >
          Любой фильм (TMDB)
        </button>
      </div>

      {source === 'library' ? (
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
      ) : (
        <div className="mb-4 flex flex-col gap-3 rounded-xl bg-surface p-4">
          <label className="flex flex-col gap-1 text-sm">
            Жанр
            <select
              value={tmdbGenreId}
              onChange={(e) => {
                setTmdbGenreId(e.target.value);
                reset();
              }}
              className="rounded-lg border border-white/10 bg-background px-3 py-2"
            >
              <option value="ALL">Любой</option>
              {tmdbGenres.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {genre.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Год от
              <input
                type="number"
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                placeholder="1990"
                className="rounded-lg border border-white/10 bg-background px-3 py-2"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Год до
              <input
                type="number"
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                placeholder="2026"
                className="rounded-lg border border-white/10 bg-background px-3 py-2"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            Мин. рейтинг TMDB
            <input
              type="number"
              min={0}
              max={10}
              step={0.5}
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              placeholder="например, 7"
              className="rounded-lg border border-white/10 bg-background px-3 py-2"
            />
          </label>
        </div>
      )}

      <button
        onClick={() => (source === 'library' ? spinLibrary(false) : spinTmdb())}
        disabled={spinning || (source === 'library' && allMovies.length === 0)}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-mint py-3 font-semibold text-black hover:bg-mint-hover disabled:opacity-50"
      >
        {spinning ? <Loader2 className="animate-spin" size={18} /> : <Shuffle size={18} />}
        Крутить
      </button>

      {source === 'library' && allMovies.length === 0 && (
        <p className="mt-4 text-center text-sm text-text-muted">
          В библиотеке пока нет фильмов — добавьте что-нибудь на главной странице.
        </p>
      )}

      {source === 'library' && result && (
        <div className="mt-6">
          <div className="mx-auto max-w-[240px]">
            <MovieCard
              movie={result}
              onUpdate={(id, patch) => setResult((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev))}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => spinLibrary(true)}
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

      {source === 'library' && result === null && candidateCount === 0 && (
        <p className="mt-6 text-center text-sm text-text-muted">
          Под такие фильтры ничего не подошло. Попробуйте изменить критерии.
        </p>
      )}

      {source === 'tmdb' && tmdbResult && (
        <div className="mt-6">
          <div className="mx-auto max-w-[240px]">
            <TmdbResultCard
              item={tmdbResult}
              adding={addingId === tmdbResult.tmdbId}
              added={addedIds.has(tmdbResult.tmdbId)}
              onAdd={() => add(tmdbResult.tmdbId)}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={spinTmdb}
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

      {source === 'tmdb' && tmdbNotFound && (
        <p className="mt-6 text-center text-sm text-text-muted">
          Под такие фильтры ничего не нашлось в TMDB. Попробуйте изменить критерии.
        </p>
      )}
    </div>
  );
}
