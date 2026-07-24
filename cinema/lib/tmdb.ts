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

export async function searchMulti(query: string, page = 1): Promise<PagedResult> {
  const data = await tmdbFetch('/search/multi', { query, include_adult: 'false', page: String(page) });
  const results = (data.results ?? [])
    .filter((r: { media_type: string }) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r: { media_type: MediaType }) => normalizeResult(r, r.media_type));
  return { results, totalPages: Math.min(data.total_pages ?? 1, 500) };
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

export async function fetchTrendingAll(page: number): Promise<PagedResult> {
  const data = await tmdbFetch('/trending/all/day', { page: String(page) });
  const results = (data.results ?? [])
    .filter((r: { media_type: string }) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r: { media_type: MediaType }) => normalizeResult(r, r.media_type));
  return { results, totalPages: Math.min(data.total_pages ?? 1, 500) };
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export async function getGenreList(mediaType: MediaType): Promise<TmdbGenre[]> {
  const data = await tmdbFetch(`/genre/${mediaType}/list`);
  return data.genres ?? [];
}

export interface DiscoverFilters {
  genreId?: string;
  countryCode?: string;
  yearFrom?: string;
  yearTo?: string;
  minRating?: string;
}

// Оставлено для обратной совместимости импортов.
export type RandomDiscoverFilters = DiscoverFilters;

const RANDOM_SORT_OPTIONS = ['popularity.desc', 'vote_average.desc', 'vote_count.desc'];

function buildDiscoverParams(mediaType: MediaType, filters: DiscoverFilters, sortBy: string): Record<string, string> {
  const params: Record<string, string> = {
    include_adult: 'false',
    sort_by: sortBy,
    'vote_count.gte': '50',
  };
  if (filters.genreId) params.with_genres = filters.genreId;
  if (filters.countryCode) params.with_origin_country = filters.countryCode;
  if (filters.minRating) params['vote_average.gte'] = filters.minRating;
  const dateField = mediaType === 'movie' ? 'primary_release_date' : 'first_air_date';
  if (filters.yearFrom) params[`${dateField}.gte`] = `${filters.yearFrom}-01-01`;
  if (filters.yearTo) params[`${dateField}.lte`] = `${filters.yearTo}-12-31`;
  return params;
}

// Одна случайная страница кандидатов. Сортировка тоже случайна на каждый вызов,
// чтобы пул кандидатов не был всегда смещён к самым раскрученным тайтлам.
export async function discoverCandidatePage(
  mediaType: MediaType,
  filters: DiscoverFilters
): Promise<PagedResult> {
  const sortBy = RANDOM_SORT_OPTIONS[Math.floor(Math.random() * RANDOM_SORT_OPTIONS.length)];
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
  filters: DiscoverFilters
): Promise<TmdbSearchResult | null> {
  const { results } = await discoverCandidatePage(mediaType, filters);
  if (results.length === 0) return null;
  return results[Math.floor(Math.random() * results.length)];
}

export type CatalogSort = 'popularity' | 'rating' | 'newest' | 'oldest';

export const CATALOG_SORT_LABELS: Record<CatalogSort, string> = {
  popularity: 'Популярные',
  rating: 'По рейтингу TMDB',
  newest: 'Сначала новые',
  oldest: 'Сначала старые',
};

function resolveCatalogSortBy(mediaType: MediaType, sort: CatalogSort): string {
  const dateField = mediaType === 'movie' ? 'primary_release_date' : 'first_air_date';
  switch (sort) {
    case 'rating':
      return 'vote_average.desc';
    case 'newest':
      return `${dateField}.desc`;
    case 'oldest':
      return `${dateField}.asc`;
    case 'popularity':
    default:
      return 'popularity.desc';
  }
}

// Обычная (не случайная) страница каталога — для разделов "Фильмы"/"Сериалы"/"Мультфильмы"
// с явными фильтрами и сортировкой от пользователя.
export async function discoverPage(
  mediaType: MediaType,
  filters: DiscoverFilters,
  sort: CatalogSort,
  page: number
): Promise<PagedResult> {
  const params = buildDiscoverParams(mediaType, filters, resolveCatalogSortBy(mediaType, sort));
  const data = await tmdbFetch(`/discover/${mediaType}`, { ...params, page: String(page) });
  return {
    results: (data.results ?? []).map((r: object) => normalizeResult(r, mediaType)),
    totalPages: Math.min(data.total_pages ?? 1, 500),
  };
}

// TMDB discover, отсортированный по дате релиза, нестабилен на стыке страниц:
// у многих старых тайтлов дата совпадает или отсутствует, и TMDB по-разному
// разбивает такие совпадения в разных запросах — из-за этого "следующая
// страница" иногда возвращает элементы из уже показанного диапазона дат.
// Забираем сразу несколько сырых страниц TMDB на одну нашу и пересортировываем
// их локально с детерминированным вторым ключом (id), чтобы порядок никогда
// не откатывался назад.
const STABLE_DATE_SORT_RAW_PAGES_PER_BATCH = 3;

interface StableDateBatchResult {
  results: TmdbSearchResult[];
  hasMore: boolean;
}

async function fetchDiscoverRawPages(
  mediaType: MediaType,
  filters: DiscoverFilters,
  sort: CatalogSort,
  rawPages: number[]
): Promise<{ results: TmdbSearchResult[]; totalPages: number }> {
  const fetched = await Promise.all(rawPages.map((rawPage) => discoverPage(mediaType, filters, sort, rawPage)));
  const totalPages = fetched.reduce((max, f) => Math.max(max, f.totalPages), 0);
  return { results: fetched.flatMap((f) => f.results), totalPages };
}

function sortByDateStable(results: TmdbSearchResult[], sort: 'newest' | 'oldest'): TmdbSearchResult[] {
  const multiplier = sort === 'oldest' ? 1 : -1;
  return [...results].sort((a, b) => {
    const dateA = a.release_date ?? '';
    const dateB = b.release_date ?? '';
    if (dateA !== dateB) return multiplier * dateA.localeCompare(dateB);
    return a.id - b.id;
  });
}

export async function discoverPageStableDate(
  sources: { mediaType: MediaType; filters: DiscoverFilters }[],
  sort: 'newest' | 'oldest',
  page: number
): Promise<StableDateBatchResult> {
  const rawPages = Array.from(
    { length: STABLE_DATE_SORT_RAW_PAGES_PER_BATCH },
    (_, i) => (page - 1) * STABLE_DATE_SORT_RAW_PAGES_PER_BATCH + i + 1
  );
  const batches = await Promise.all(sources.map((s) => fetchDiscoverRawPages(s.mediaType, s.filters, sort, rawPages)));
  const totalPages = Math.max(...batches.map((b) => b.totalPages));
  const lastRawPage = rawPages[rawPages.length - 1];

  // На стыке "сырых" страниц TMDB иногда сдвигает элемент между запросами —
  // подстраховываемся от дублей в объединённом наборе.
  const deduped = [...new Map(batches.flatMap((b) => b.results).map((r) => [r.id, r])).values()];

  return {
    results: sortByDateStable(deduped, sort),
    hasMore: lastRawPage < totalPages,
  };
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
