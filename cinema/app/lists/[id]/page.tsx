'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import { MovieCard } from '@/components/MovieCard';
import type { MovieList, MovieWithEntry } from '@/lib/types';

export default function ListDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [list, setList] = useState<MovieList | null>(null);
  const [movies, setMovies] = useState<MovieWithEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/lists').then((res) => res.json()),
      fetch(`/api/movies?listId=${params.id}`).then((res) => res.json()),
    ]).then(([listsData, moviesData]) => {
      setList((listsData.lists ?? []).find((l: MovieList) => l.id === params.id) ?? null);
      setMovies(moviesData.movies ?? []);
      setLoading(false);
    });
  }, [params.id]);

  function updateMovie(movieId: string, patch: Partial<MovieWithEntry>) {
    setMovies((prev) => prev.map((m) => (m.id === movieId ? { ...m, ...patch } : m)));
  }

  async function deleteList() {
    if (!confirm(`Удалить список «${list?.name}»? Фильмы останутся в библиотеке.`)) return;
    await fetch(`/api/lists/${params.id}`, { method: 'DELETE' });
    router.push('/lists');
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-text-muted">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (!list) {
    return <p className="py-16 text-center text-text-muted">Список не найден.</p>;
  }

  return (
    <div>
      <Link href="/lists" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-main">
        <ArrowLeft size={16} />
        Мои списки
      </Link>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-lavender">{list.name}</h1>
        <button onClick={deleteList} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-red-400">
          <Trash2 size={16} />
          Удалить список
        </button>
      </div>

      {movies.length === 0 ? (
        <p className="py-16 text-center text-text-muted">В этом списке пока нет фильмов.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} onUpdate={updateMovie} />
          ))}
        </div>
      )}
    </div>
  );
}
