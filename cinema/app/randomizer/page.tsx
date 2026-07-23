'use client';

import { useEffect, useState } from 'react';
import { Shuffle, Loader2 } from 'lucide-react';
import { TmdbResultCard } from '@/components/TmdbResultCard';
import { COUNTRIES, type TmdbListItem } from '@/lib/types';
import type { TmdbGenre, MediaType } from '@/lib/tmdb';

type MediaTypeFilter = MediaType | 'any';

const fieldClass =
  'w-full min-w-0 rounded-lg border border-white/10 bg-background px-3 py-2 focus:border-lavender focus:outline-none';

const MEDIA_OPTIONS: { value: MediaTypeFilter; label: string }[] = [
  { value: 'any', label: 'Любой' },
  { value: 'movie', label: 'Фильм' },
  { value: 'tv', label: 'Сериал' },
];

export default function RandomizerPage() {
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaTypeFilter>('any');
  const [genres, setGenres] = useState<TmdbGenre[]>([]);
  const [genreId, setGenreId] = useState('ALL');
  const [country, setCountry] = useState('ALL');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [minRating, setMinRating] = useState('');

  const [result, setResult] = useState<TmdbListItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    const genreMediaType = mediaTypeFilter === 'tv' ? 'tv' : 'movie';
    fetch(`/api/tmdb/genres?mediaType=${genreMediaType}`)
      .then((res) => res.json())
      .then((data) => setGenres(data.genres ?? []));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset genre when switching media type
    setGenreId('ALL');
  }, [mediaTypeFilter]);

  async function spin() {
    setSpinning(true);
    const params = new URLSearchParams();
    if (mediaTypeFilter !== 'any') params.set('mediaType', mediaTypeFilter);
    if (genreId !== 'ALL') params.set('genreId', genreId);
    if (country !== 'ALL') params.set('country', country);
    if (yearFrom) params.set('yearFrom', yearFrom);
    if (yearTo) params.set('yearTo', yearTo);
    if (minRating) params.set('minRating', minRating);

    try {
      const res = await fetch(`/api/tmdb/random?${params.toString()}`);
      const data = await res.json();
      setResult(data.movie ?? null);
      setNotFound(!data.movie);
    } finally {
      setSpinning(false);
    }
  }

  function reset() {
    setResult(null);
    setNotFound(false);
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 flex items-center gap-2 text-xl font-bold text-lavender">
        <Shuffle size={22} />
        Рандомайзер
      </h1>

      <div className="mb-4 flex flex-col gap-3 rounded-xl bg-surface p-4">
        <div className="flex gap-2">
          {MEDIA_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setMediaTypeFilter(opt.value);
                reset();
              }}
              className={`flex-1 rounded-full py-1.5 text-sm font-medium ${
                mediaTypeFilter === opt.value
                  ? 'bg-lavender text-black'
                  : 'bg-background text-text-muted hover:bg-surface-hover'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label className="flex min-w-0 flex-col gap-1 text-sm">
          Жанр
          <select
            value={genreId}
            onChange={(e) => {
              setGenreId(e.target.value);
              reset();
            }}
            className={fieldClass}
          >
            <option value="ALL">Любой</option>
            {genres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1 text-sm">
          Страна
          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              reset();
            }}
            className={fieldClass}
          >
            <option value="ALL">Любая</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
            Год от
            <input
              type="number"
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value)}
              placeholder="1990"
              className={fieldClass}
            />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
            Год до
            <input
              type="number"
              value={yearTo}
              onChange={(e) => setYearTo(e.target.value)}
              placeholder="2026"
              className={fieldClass}
            />
          </label>
        </div>

        <label className="flex min-w-0 flex-col gap-1 text-sm">
          Мин. рейтинг (IMDb/КП)
          <input
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            placeholder="например, 7"
            className={fieldClass}
          />
        </label>
      </div>

      <button
        onClick={spin}
        disabled={spinning}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-mint py-3 font-semibold text-black hover:bg-mint-hover disabled:opacity-50"
      >
        {spinning ? <Loader2 className="animate-spin" size={18} /> : <Shuffle size={18} />}
        Крутить
      </button>

      {result && (
        <div className="mt-6">
          <div className="mx-auto max-w-[240px]">
            <TmdbResultCard item={result} />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={spin} className="flex-1 rounded-full bg-surface py-2 text-sm font-medium hover:bg-surface-hover">
              Ещё раз
            </button>
            <button onClick={reset} className="flex-1 rounded-full bg-surface py-2 text-sm font-medium hover:bg-surface-hover">
              Сбросить
            </button>
          </div>
        </div>
      )}

      {notFound && (
        <p className="mt-6 text-center text-sm text-text-muted">
          Под такие фильтры ничего не нашлось в TMDB. Попробуйте изменить критерии.
        </p>
      )}
    </div>
  );
}
