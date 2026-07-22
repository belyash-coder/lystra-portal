'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { MovieCard } from '@/components/MovieCard';
import { AddMovieModal } from '@/components/AddMovieModal';
import { STATUS_LABELS, type MovieWithEntry, type WatchStatus } from '@/lib/types';

type StatusFilter = 'ALL' | WatchStatus;

export default function LibraryPage() {
  const [movies, setMovies] = useState<MovieWithEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  function loadMovies() {
    setLoading(true);
    fetch('/api/movies')
      .then((res) => res.json())
      .then((data) => setMovies(data.movies ?? []))
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
  useEffect(loadMovies, []);

  const genres = useMemo(() => {
    const set = new Set<string>();
    movies.forEach((m) => m.genres.forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [movies]);

  const filtered = movies.filter((movie) => {
    if (query.trim() && !movie.title.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (genreFilter !== 'ALL' && !movie.genres.includes(genreFilter)) return false;
    if (statusFilter !== 'ALL' && movie.status !== statusFilter) return false;
    return true;
  });

  function updateMovie(movieId: string, patch: Partial<MovieWithEntry>) {
    setMovies((prev) => prev.map((m) => (m.id === movieId ? { ...m, ...patch } : m)));
  }

  function removeMovie(movieId: string) {
    setMovies((prev) => prev.filter((m) => m.id !== movieId));
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию..."
            className="w-full rounded-full border border-white/10 bg-surface py-2 pl-9 pr-3 text-sm focus:border-lavender focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-full border border-white/10 bg-surface px-3 py-2 text-sm"
          >
            <option value="ALL">Все статусы</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="rounded-full border border-white/10 bg-surface px-3 py-2 text-sm"
          >
            <option value="ALL">Все жанры</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-full bg-lavender px-4 py-2 text-sm font-semibold text-black hover:bg-lavender-hover"
          >
            <Plus size={16} />
            Добавить
          </button>
        </div>
      </div>

      {loading ? (
        <p className="py-16 text-center text-text-muted">Загрузка библиотеки...</p>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-text-muted">
          {movies.length === 0 ? 'Библиотека пуста. Добавьте первый фильм!' : 'Ничего не найдено по фильтрам.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((movie) => (
            <MovieCard key={movie.id} movie={movie} onUpdate={updateMovie} onRemove={removeMovie} />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddMovieModal onClose={() => setShowAddModal(false)} onAdded={loadMovies} />
      )}
    </div>
  );
}
