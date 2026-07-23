'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, Loader2 } from 'lucide-react';
import { StatusSelect } from '@/components/StatusSelect';
import { RatingStars } from '@/components/RatingStars';
import { ListPicker } from '@/components/ListPicker';
import { TmdbResultCard } from '@/components/TmdbResultCard';
import type { MovieWithEntry, MovieList, TmdbListItem, WatchStatus } from '@/lib/types';

interface CastMember {
  id: number;
  name: string;
  character: string;
  photoUrl: string | null;
}

interface WatchProvider {
  name: string;
  logoUrl: string;
}

interface Extras {
  trailerKey: string | null;
  creators: string | null;
  cast: CastMember[];
  similar: TmdbListItem[];
  watchProviders: { link: string | null; flatrate: WatchProvider[]; rent: WatchProvider[]; buy: WatchProvider[] } | null;
}

export default function MovieDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [movie, setMovie] = useState<(MovieWithEntry & { listIds: string[] }) | null>(null);
  const [extras, setExtras] = useState<Extras | null>(null);
  const [lists, setLists] = useState<MovieList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/movies/${params.id}`).then((res) => res.json()),
      fetch(`/api/movies/${params.id}/extras`).then((res) => (res.ok ? res.json() : null)),
      fetch('/api/lists').then((res) => res.json()),
    ]).then(([movieData, extrasData, listsData]) => {
      setMovie(movieData.movie ?? null);
      setExtras(
        extrasData
          ? {
              trailerKey: extrasData.trailerKey ?? null,
              creators: extrasData.creators ?? null,
              cast: extrasData.cast ?? [],
              similar: extrasData.similar ?? [],
              watchProviders: extrasData.watchProviders ?? null,
            }
          : null
      );
      setLists(listsData.lists ?? []);
      setLoading(false);
    });
  }, [params.id]);

  async function patchEntry(body: { status?: WatchStatus; rating?: number }) {
    if (!movie) return;
    setMovie({ ...movie, ...body });
    await fetch(`/api/movies/${movie.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-text-muted">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (!movie) {
    return <p className="py-16 text-center text-text-muted">Фильм не найден.</p>;
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-main"
      >
        <ArrowLeft size={16} />
        Назад
      </button>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="w-full max-w-[220px] shrink-0 overflow-hidden rounded-xl bg-neutral-900">
          {movie.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={movie.posterUrl} alt={movie.title} className="w-full object-cover" />
          ) : (
            <div className="flex aspect-[2/3] items-center justify-center text-center text-sm text-text-muted">
              {movie.title}
            </div>
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-xl font-bold">{movie.title}</h1>
          {movie.originalTitle && movie.originalTitle !== movie.title && (
            <p className="text-sm text-text-muted">{movie.originalTitle}</p>
          )}
          <p className="mt-1 text-sm text-text-muted">
            {movie.releaseYear ?? '—'}
            {movie.mediaType === 'movie' && movie.runtime ? ` · ${movie.runtime} мин` : ''}
            {movie.mediaType === 'tv' && movie.numberOfSeasons
              ? ` · ${movie.numberOfSeasons} сез., ${movie.numberOfEpisodes ?? '?'} серий`
              : ''}
            {movie.tmdbRating != null ? ` · ⭐ ${movie.tmdbRating.toFixed(1)}` : ''}
          </p>
          {extras?.creators && (
            <p className="mt-1 text-sm text-text-muted">
              {movie.mediaType === 'movie' ? 'Режиссёр' : 'Создатели'}: {extras.creators}
            </p>
          )}

          {movie.genres.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {movie.genres.map((genre) => (
                <span key={genre} className="rounded-md border border-lavender/30 px-1.5 py-0.5 text-[10px] text-text-muted">
                  {genre}
                </span>
              ))}
            </div>
          )}

          {movie.overview && <p className="mt-3 text-sm text-text-muted">{movie.overview}</p>}

          <div className="mt-4 flex max-w-xs flex-col gap-2">
            <StatusSelect value={movie.status} onChange={(status) => patchEntry({ status })} />
            {movie.status === 'WATCHED' && (
              <RatingStars value={movie.rating} onChange={(rating) => patchEntry({ rating })} />
            )}
          </div>
        </div>
      </div>

      {extras?.trailerKey && (
        <div className="mt-6">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-text-muted">
            <Play size={16} />
            Трейлер
          </h2>
          <div className="aspect-video w-full overflow-hidden rounded-xl">
            <iframe
              src={`https://www.youtube.com/embed/${extras.trailerKey}`}
              title="Трейлер"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </div>
      )}

      {extras && extras.cast.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-text-muted">В ролях</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {extras.cast.map((c) => (
              <div key={c.id} className="w-20 shrink-0 text-center">
                <div className="mx-auto mb-1 h-20 w-20 overflow-hidden rounded-full bg-neutral-800">
                  {c.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.photoUrl} alt={c.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <p className="line-clamp-1 text-[11px]">{c.name}</p>
                <p className="line-clamp-1 text-[10px] text-text-muted">{c.character}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {extras?.watchProviders &&
        (extras.watchProviders.flatrate.length > 0 ||
          extras.watchProviders.rent.length > 0 ||
          extras.watchProviders.buy.length > 0) && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-text-muted">Где посмотреть</h2>
            <div className="flex flex-wrap gap-2">
              {[...extras.watchProviders.flatrate, ...extras.watchProviders.rent, ...extras.watchProviders.buy].map(
                (p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.name} src={p.logoUrl} alt={p.name} title={p.name} className="h-10 w-10 rounded-lg" />
                )
              )}
            </div>
            {extras.watchProviders.link && (
              <a
                href={extras.watchProviders.link}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs text-mint hover:underline"
              >
                Подробнее на TMDB →
              </a>
            )}
          </div>
        )}

      <div className="mt-6">
        <ListPicker
          movieId={movie.id}
          lists={lists}
          listIds={movie.listIds}
          onListsChange={setLists}
          onMembershipChange={(listIds) => setMovie({ ...movie, listIds })}
        />
      </div>

      {extras && extras.similar.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-text-muted">Похожее</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {extras.similar.map((item) => (
              <TmdbResultCard key={item.tmdbId} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
