'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Users2, Search, Loader2, X, Trash2 } from 'lucide-react';
import { SharedMovieCard } from '@/components/SharedMovieCard';
import { ANIMATION_GENRE_NAME, type SharedListMovie, type TmdbListItem } from '@/lib/types';

type Tab = 'movie' | 'tv' | 'animation';

const TABS: { value: Tab; label: string }[] = [
  { value: 'movie', label: 'Фильмы' },
  { value: 'tv', label: 'Сериалы' },
  { value: 'animation', label: 'Мультфильмы' },
];

function partnerLabel(partner: { username: string | null; firstName: string | null } | null): string {
  if (!partner) return 'Ожидание участника';
  return partner.username ? `@${partner.username}` : (partner.firstName ?? 'Без имени');
}

function matchesTab(movie: SharedListMovie, tab: Tab): boolean {
  const isAnimation = movie.genres.includes(ANIMATION_GENRE_NAME);
  if (tab === 'animation') return isAnimation;
  if (isAnimation) return false;
  return movie.mediaType === tab;
}

export default function SharedListDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [partner, setPartner] = useState<{ username: string | null; firstName: string | null } | null>(null);
  const [movies, setMovies] = useState<SharedListMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('movie');
  const [notFound, setNotFound] = useState(false);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TmdbListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  function load() {
    setLoading(true);
    fetch(`/api/shared-lists/${params.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) {
          setNotFound(true);
          return;
        }
        setPartner(data.list.partner);
        setMovies(data.movies ?? []);
      })
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount / when id changes
  useEffect(load, [params.id]);

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
        .then((data) => {
          setResults(data.results ?? []);
          setSearchOpen(true);
        })
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function addMovie(item: TmdbListItem) {
    setAddingId(item.tmdbId);
    try {
      const res = await fetch(`/api/shared-lists/${params.id}/movies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdbId: item.tmdbId, mediaType: item.mediaType }),
      });
      if (res.ok) {
        setQuery('');
        setSearchOpen(false);
        load();
      }
    } finally {
      setAddingId(null);
    }
  }

  async function toggleWatched(movieId: string, watched: boolean) {
    setMovies((prev) => prev.map((m) => (m.movieId === movieId ? { ...m, watched } : m)));
    await fetch(`/api/shared-lists/${params.id}/movies/${movieId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watched }),
    });
  }

  async function removeMovie(movieId: string) {
    setMovies((prev) => prev.filter((m) => m.movieId !== movieId));
    await fetch(`/api/shared-lists/${params.id}/movies/${movieId}`, { method: 'DELETE' });
  }

  async function removeList() {
    if (!confirm('Удалить совместный список для обоих участников?')) return;
    await fetch(`/api/shared-lists/${params.id}`, { method: 'DELETE' });
    router.push('/shared-lists');
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-text-muted">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (notFound) {
    return <p className="py-16 text-center text-text-muted">Список не найден.</p>;
  }

  const filtered = movies.filter((m) => matchesTab(m, tab));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold text-lavender">
          <Users2 size={22} />
          Смотреть вместе с {partnerLabel(partner)}
        </h1>
        <button
          onClick={removeList}
          className="flex items-center justify-center rounded-lg bg-surface px-2.5 py-2 text-red-400 hover:bg-surface-hover"
          aria-label="Удалить список"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="relative mb-4" ref={searchRef}>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim() && setSearchOpen(true)}
            placeholder="Добавить фильм или сериал..."
            className="w-full rounded-full border border-white/10 bg-surface py-2 pl-9 pr-9 text-sm focus:border-lavender focus:outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
              aria-label="Очистить"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {searchOpen && query.trim() && (
          <div className="absolute left-0 right-0 top-11 z-20 max-h-96 overflow-y-auto rounded-xl bg-surface shadow-xl">
            {searching ? (
              <div className="flex justify-center py-6 text-text-muted">
                <Loader2 className="animate-spin" size={18} />
              </div>
            ) : results.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-muted">Ничего не найдено</p>
            ) : (
              results.map((item) => (
                <button
                  key={`${item.mediaType}-${item.tmdbId}`}
                  onClick={() => addMovie(item)}
                  disabled={addingId === item.tmdbId}
                  className="flex w-full items-center gap-3 p-2 text-left hover:bg-surface-hover disabled:opacity-60"
                >
                  {item.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.posterUrl} alt="" className="h-14 w-10 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="h-14 w-10 shrink-0 rounded bg-neutral-800" />
                  )}
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="text-xs text-text-muted">{item.releaseYear ?? ''}</p>
                  </div>
                  {addingId === item.tmdbId && <Loader2 className="animate-spin text-text-muted" size={16} />}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              tab === t.value ? 'bg-lavender text-black' : 'bg-surface text-text-muted hover:bg-surface-hover'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-text-muted">Здесь пока пусто — добавьте что-нибудь через поиск выше.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((movie) => (
            <SharedMovieCard key={movie.movieId} movie={movie} onToggleWatched={toggleWatched} onRemove={removeMovie} />
          ))}
        </div>
      )}
    </div>
  );
}
