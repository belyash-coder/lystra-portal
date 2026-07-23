const TMDB_BASE = 'https://api.themoviedb.org/3';
export const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
export const TMDB_PROFILE_BASE = 'https://image.tmdb.org/t/p/w185';
export const TMDB_LOGO_BASE = 'https://image.tmdb.org/t/p/w92';

export type MediaType = 'movie' | 'tv';

// Id жанра "Анимация/Мультфильм" — совпадает для /genre/movie/list и /genre/tv/list в TMDB.
export const ANIMATION_GENRE_ID = 16;

function getApiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error('TMDB_API_KEY не задан');
  return key;
}

async function tmdbFetch(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set('api_key', getApiKey());
  url.searchParams.set('language', 'ru-RU');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB запрос не удался: ${res.status}`);
  }
  return res.json();
}

export interface TmdbSearchResult {
  id: number;
  media_type: MediaType;
  title: string;
  original_title: string;
  poster_path: string | null;
  release_date: string | null;
  overview: string | null;
  vote_average: number | null;
}

// TMDB по-разному называет поля у фильмов (title/release_date) и сериалов
// (name/first_air_date) — приводим к единой форме независимо от типа.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeResult(raw: any, mediaType: MediaType): TmdbSearchResult {
  return {
    id: raw.id,
    media_type: mediaType,
    title: raw.title ?? raw.name ?? '',
    original_title: raw.original_title ?? raw.original_name ?? '',
    poster_path: raw.poster_path ?? null,
    release_date: raw.release_date ?? raw.first_air_date ?? null,
    overview: raw.overview ?? null,
    vote_average: raw.vote_average ?? null,
  };
}

export async function searchMulti(query: string): Promise<TmdbSearchResult[]> {
  const data = await tmdbFetch('/search/multi', { query, include_adult: 'false' });
  return (data.results ?? [])
    .filter((r: { media_type: string }) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r: { media_type: MediaType }) => normalizeResult(r, r.media_type));
}

export interface TmdbTitleDetails extends TmdbSearchResult {
  runtime: number | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  genres: { id: number; name: string }[];
}

export async function getTitleDetails(mediaType: MediaType, tmdbId: number): Promise<TmdbTitleDetails> {
  const data = await tmdbFetch(`/${mediaType}/${tmdbId}`);
  return {
    ...normalizeResult(data, mediaType),
    runtime: mediaType === 'movie' ? (data.runtime ?? null) : (data.episode_run_time?.[0] ?? null),
    numberOfSeasons: mediaType === 'tv' ? (data.number_of_seasons ?? null) : null,
    numberOfEpisodes: mediaType === 'tv' ? (data.number_of_episodes ?? null) : null,
    genres: data.genres ?? [],
  };
}

interface PagedResult {
  results: TmdbSearchResult[];
  totalPages: number;
}

export async function fetchPopular(mediaType: MediaType, page: number): Promise<PagedResult> {
  const data = await tmdbFetch(`/${mediaType}/popular`, { page: String(page) });
  return {
    results: (data.results ?? []).map((r: object) => normalizeResult(r, mediaType)),
    totalPages: Math.min(data.total_pages ?? 1, 500),
  };
}

export async function fetchTrendingAll(page: number): Promise<PagedResult> {
  const data = await tmdbFetch('/trending/all/day', { page: String(page) });
  const results = (data.results ?? [])
    .filter((r: { media_type: string }) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r: { media_type: MediaType }) => normalizeResult(r, r.media_type));
  return { results, totalPages: Math.min(data.total_pages ?? 1, 500) };
}

export async function fetchAnimation(mediaType: MediaType, page: number): Promise<PagedResult> {
  const data = await tmdbFetch(`/discover/${mediaType}`, {
    page: String(page),
    with_genres: String(ANIMATION_GENRE_ID),
    sort_by: 'popularity.desc',
  });
  return {
    results: (data.results ?? []).map((r: object) => normalizeResult(r, mediaType)),
    totalPages: Math.min(data.total_pages ?? 1, 500),
  };
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export async function getGenreList(mediaType: MediaType): Promise<TmdbGenre[]> {
  const data = await tmdbFetch(`/genre/${mediaType}/list`);
  return data.genres ?? [];
}

export interface RandomDiscoverFilters {
  genreId?: string;
  countryCode?: string;
  yearFrom?: string;
  yearTo?: string;
}

const SORT_OPTIONS = ['popularity.desc', 'vote_average.desc', 'vote_count.desc'];

function buildDiscoverParams(mediaType: MediaType, filters: RandomDiscoverFilters, sortBy: string): Record<string, string> {
  const params: Record<string, string> = {
    include_adult: 'false',
    sort_by: sortBy,
    'vote_count.gte': '50',
  };
  if (filters.genreId) params.with_genres = filters.genreId;
  if (filters.countryCode) params.with_origin_country = filters.countryCode;
  const dateField = mediaType === 'movie' ? 'primary_release_date' : 'first_air_date';
  if (filters.yearFrom) params[`${dateField}.gte`] = `${filters.yearFrom}-01-01`;
  if (filters.yearTo) params[`${dateField}.lte`] = `${filters.yearTo}-12-31`;
  return params;
}

// Одна случайная страница кандидатов. Сортировка тоже случайна на каждый вызов,
// чтобы пул кандидатов не был всегда смещён к самым раскрученным тайтлам.
export async function discoverCandidatePage(
  mediaType: MediaType,
  filters: RandomDiscoverFilters
): Promise<PagedResult> {
  const sortBy = SORT_OPTIONS[Math.floor(Math.random() * SORT_OPTIONS.length)];
  const params = buildDiscoverParams(mediaType, filters, sortBy);

  const firstPage = await tmdbFetch(`/discover/${mediaType}`, { ...params, page: '1' });
  const totalPages = Math.min(firstPage.total_pages ?? 1, 500);
  if (totalPages === 0 || !firstPage.results?.length) return { results: [], totalPages: 0 };

  const randomPage = 1 + Math.floor(Math.random() * totalPages);
  const data =
    randomPage === 1 ? firstPage : await tmdbFetch(`/discover/${mediaType}`, { ...params, page: String(randomPage) });

  return { results: (data.results ?? []).map((r: object) => normalizeResult(r, mediaType)), totalPages };
}

export async function randomDiscoverMovie(
  mediaType: MediaType,
  filters: RandomDiscoverFilters
): Promise<TmdbSearchResult | null> {
  const { results } = await discoverCandidatePage(mediaType, filters);
  if (results.length === 0) return null;
  return results[Math.floor(Math.random() * results.length)];
}

export async function getExternalImdbId(mediaType: MediaType, tmdbId: number): Promise<string | null> {
  try {
    const data = await tmdbFetch(`/${mediaType}/${tmdbId}/external_ids`);
    return data.imdb_id ?? null;
  } catch {
    return null;
  }
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface TmdbWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface TmdbTitleExtras {
  trailerKey: string | null;
  creators: string | null;
  cast: TmdbCastMember[];
  similar: TmdbSearchResult[];
  watchProviders: {
    flatrate: TmdbWatchProvider[];
    rent: TmdbWatchProvider[];
    buy: TmdbWatchProvider[];
    link: string | null;
  } | null;
}

export async function getTitleExtras(mediaType: MediaType, tmdbId: number): Promise<TmdbTitleExtras> {
  const data = await tmdbFetch(`/${mediaType}/${tmdbId}`, {
    append_to_response: 'videos,credits,similar,watch/providers',
  });

  const trailer =
    (data.videos?.results ?? []).find((v: { site: string; type: string }) => v.site === 'YouTube' && v.type === 'Trailer') ??
    (data.videos?.results ?? []).find((v: { site: string }) => v.site === 'YouTube');

  let creators: string | null = null;
  if (mediaType === 'movie') {
    const director = (data.credits?.crew ?? []).find((c: { job: string }) => c.job === 'Director');
    creators = director?.name ?? null;
  } else {
    const createdBy = data.created_by ?? [];
    creators = createdBy.length ? createdBy.map((c: { name: string }) => c.name).join(', ') : null;
  }

  const providersByRegion = data['watch/providers']?.results ?? {};
  const regionData = providersByRegion.RU ?? providersByRegion.US ?? Object.values(providersByRegion)[0];

  return {
    trailerKey: trailer?.key ?? null,
    creators,
    cast: (data.credits?.cast ?? []).slice(0, 8),
    similar: (data.similar?.results ?? []).slice(0, 8).map((r: object) => normalizeResult(r, mediaType)),
    watchProviders: regionData
      ? {
          flatrate: regionData.flatrate ?? [],
          rent: regionData.rent ?? [],
          buy: regionData.buy ?? [],
          link: regionData.link ?? null,
        }
      : null,
  };
}
