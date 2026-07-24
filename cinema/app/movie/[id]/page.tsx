'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, Loader2, Star } from 'lucide-react';
import { StatusSelect } from '@/components/StatusSelect';
import { RatingStars } from '@/components/RatingStars';
import { ListPicker } from '@/components/ListPicker';
import { SharedListPicker } from '@/components/SharedListPicker';
import { TmdbResultCard } from '@/components/TmdbResultCard';
import type { MovieWithEntry, MovieList, SharedListSummary, TmdbListItem, WatchStatus } from '@/lib/types';

function formatVotes(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
}

function openExternalLink(url: string) {
  if (window.Telegram?.WebApp?.openLink) {
    window.Telegram.WebApp.openLink(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

interface ExternalRatings {
  imdb: number | null;
  imdbVotes: number | null;
  kp: number | null;
  kpVotes: number | null;
}

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

interface Creator {
  id: number;
  name: string;
}

interface Extras {
  trailerKey: string | null;
  creators: Creator[];
  cast: CastMember[];
  similar: TmdbListItem[];
  watchProviders: { link: string | null; flatrate: WatchProvider[]; rent: WatchProvider[]; buy: WatchProvider[] } | null;
}

export default function MovieDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [movie, setMovie] = useState<(MovieWithEntry & { listIds: string[]; sharedListIds: string[] }) | null>(null);
  const [extras, setExtras] = useState<Extras | null>(null);
  const [lists, setLists] = useState<MovieList[]>([]);
  const [sharedLists, setSharedLists] = useState<SharedListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<ExternalRatings | null>(null);
  const [ratingsShown, setRatingsShown] = useState(false);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  async function toggleRatings() {
    if (ratingsShown) {
      setRatingsShown(false);
      return;
    }
    if (ratings === null && movie) {
      setRatingsLoading(true);
      try {
        const res = await fetch(`/api/tmdb/ratings?tmdbId=${movie.tmdbId}&mediaType=${movie.mediaType}`);
        const data = res.ok ? await res.json() : null;
        setRatings({
          imdb: data?.imdb?.rating ?? null,
          imdbVotes: data?.imdb?.votes ?? null,
          kp: data?.kp?.rating ?? null,
          kpVotes: data?.kp?.votes ?? null,
        });
      } finally {
        setRatingsLoading(false);
      }
    }
    setRatingsShown(true);
  }

  useEffect(() => {
    Promise.all([
      fetch(`/api/movies/${params.id}`).then((res) => res.json()),
      fetch(`/api/movies/${params.id}/extras`).then((res) => (res.ok ? res.json() : null)),
      fetch('/api/lists').then((res) => res.json()),
      fetch('/api/shared-lists').then((res) => res.json()),
    ]).then(([movieData, extrasData, listsData, sharedListsData]) => {
      setMovie(movieData.movie ?? null);
      setExtras(
        extrasData
          ? {
              trailerKey: extrasData.trailerKey ?? null,
              creators: extrasData.creators ?? [],
              cast: extrasData.cast ?? [],
              similar: extrasData.similar ?? [],
              watchProviders: extrasData.watchProviders ?? null,
            }
          : null
      );
      setLists(listsData.lists ?? []);
      setSharedLists(sharedListsData.lists ?? []);
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
          <button
            onClick={toggleRatings}
            disabled={ratingsLoading}
            className="mt-1.5 flex w-fit items-center gap-1 rounded-md bg-surface px-2 py-1 text-xs text-text-muted hover:text-lavender disabled:opacity-60"
          >
            {ratingsLoading ? <Loader2 className="animate-spin" size={12} /> : <Star size={12} />}
            {ratingsShown ? 'Скрыть рейтинги IMDb/КП' : 'Показать рейтинги IMDb/КП'}
          </button>
          {ratingsShown && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {ratings?.imdb != null && (
                <span className="inline-flex items-center gap-1 rounded-md bg-[#F5C518] px-2 py-0.5 text-xs font-bold text-black">
                  IMDb {ratings.imdb.toFixed(1)}
                  {ratings.imdbVotes != null && (
                    <span className="font-normal opacity-70">({formatVotes(ratings.imdbVotes)})</span>
                  )}
                </span>
              )}
              {ratings?.kp != null && (
                <span className="inline-flex items-center gap-1 rounded-md bg-[#FF6600] px-2 py-0.5 text-xs font-bold text-white">
                  КП {ratings.kp.toFixed(1)}
                  {ratings.kpVotes != null && (
                    <span className="font-normal opacity-80">({formatVotes(ratings.kpVotes)})</span>
                  )}
                </span>
              )}
              {ratings && ratings.imdb == null && ratings.kp == null && (
                <span className="text-xs text-text-muted">Нет данных</span>
              )}
            </div>
          )}
          {extras && extras.creators.length > 0 && (
            <p className="mt-1 text-sm text-text-muted">
              {movie.mediaType === 'movie' ? 'Режиссёр' : 'Создатели'}:{' '}
              {extras.creators.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && ', '}
                  <Link href={`/person/${c.id}`} className="text-lavender underline decoration-dotted underline-offset-2 hover:decoration-solid">
                    {c.name}
                  </Link>
                </span>
              ))}
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
          <button
            onClick={() => openExternalLink(`https://www.youtube.com/watch?v=${extras.trailerKey}`)}
            className="group relative block aspect-video w-full overflow-hidden rounded-xl bg-neutral-900"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://img.youtube.com/vi/${extras.trailerKey}/hqdefault.jpg`}
              alt="Превью трейлера"
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition group-hover:bg-black/40">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-black">
                <Play size={24} className="ml-1" fill="currentColor" />
              </span>
            </span>
          </button>
          <p className="mt-1 text-xs text-text-muted">Откроется на YouTube</p>
        </div>
      )}

      {extras && extras.cast.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-text-muted">В ролях</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {extras.cast.map((c) => (
              <Link key={c.id} href={`/person/${c.id}`} className="w-20 shrink-0 text-center">
                <div className="mx-auto mb-1 h-20 w-20 overflow-hidden rounded-full bg-neutral-800">
                  {c.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.photoUrl} alt={c.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <p className="line-clamp-1 text-[11px] hover:text-lavender">{c.name}</p>
                <p className="line-clamp-1 text-[10px] text-text-muted">{c.character}</p>
              </Link>
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

      <div className="mt-6 flex flex-col gap-4">
        <ListPicker
          movieId={movie.id}
          lists={lists}
          listIds={movie.listIds}
          onListsChange={setLists}
          onMembershipChange={(listIds) => setMovie({ ...movie, listIds })}
        />
        <SharedListPicker
          movieId={movie.id}
          lists={sharedLists}
          sharedListIds={movie.sharedListIds}
          onMembershipChange={(sharedListIds) => setMovie({ ...movie, sharedListIds })}
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
