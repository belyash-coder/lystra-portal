const TMDB_BASE = 'https://api.themoviedb.org/3';
export const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
export const TMDB_PROFILE_BASE = 'https://image.tmdb.org/t/p/w185';
export const TMDB_LOGO_BASE = 'https://image.tmdb.org/t/p/w92';

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
  title: string;
  original_title: string;
  poster_path: string | null;
  release_date: string | null;
  overview: string | null;
  vote_average: number | null;
}

export async function searchMovies(query: string): Promise<TmdbSearchResult[]> {
  const data = await tmdbFetch('/search/movie', { query, include_adult: 'false' });
  return data.results ?? [];
}

export interface TmdbMovieDetails {
  id: number;
  title: string;
  original_title: string;
  poster_path: string | null;
  release_date: string | null;
  overview: string | null;
  vote_average: number | null;
  runtime: number | null;
  genres: { id: number; name: string }[];
}

export async function getMovieDetails(tmdbId: number): Promise<TmdbMovieDetails> {
  return tmdbFetch(`/movie/${tmdbId}`);
}

export const DISCOVER_CATEGORIES = ['popular', 'now_playing', 'top_rated', 'upcoming', 'trending'] as const;
export type DiscoverCategory = (typeof DISCOVER_CATEGORIES)[number];

const DISCOVER_PATHS: Record<DiscoverCategory, string> = {
  popular: '/movie/popular',
  now_playing: '/movie/now_playing',
  top_rated: '/movie/top_rated',
  upcoming: '/movie/upcoming',
  trending: '/trending/movie/week',
};

export async function discoverMovies(category: DiscoverCategory, page = 1): Promise<TmdbSearchResult[]> {
  const data = await tmdbFetch(DISCOVER_PATHS[category], { page: String(page) });
  return data.results ?? [];
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export async function getGenreList(): Promise<TmdbGenre[]> {
  const data = await tmdbFetch('/genre/movie/list');
  return data.genres ?? [];
}

export interface RandomDiscoverFilters {
  genreId?: string;
  countryCode?: string;
  yearFrom?: string;
  yearTo?: string;
  minRating?: string;
}

export async function randomDiscoverMovie(filters: RandomDiscoverFilters): Promise<TmdbSearchResult | null> {
  const params: Record<string, string> = {
    include_adult: 'false',
    sort_by: 'popularity.desc',
    'vote_count.gte': '50',
  };
  if (filters.genreId) params.with_genres = filters.genreId;
  if (filters.countryCode) params.with_origin_country = filters.countryCode;
  if (filters.yearFrom) params['primary_release_date.gte'] = `${filters.yearFrom}-01-01`;
  if (filters.yearTo) params['primary_release_date.lte'] = `${filters.yearTo}-12-31`;
  if (filters.minRating) params['vote_average.gte'] = filters.minRating;

  const firstPage = await tmdbFetch('/discover/movie', { ...params, page: '1' });
  const totalPages = Math.min(firstPage.total_pages ?? 1, 500);
  if (totalPages === 0 || !firstPage.results?.length) return null;

  const randomPage = 1 + Math.floor(Math.random() * totalPages);
  const data =
    randomPage === 1 ? firstPage : await tmdbFetch('/discover/movie', { ...params, page: String(randomPage) });
  const results: TmdbSearchResult[] = data.results ?? [];
  if (results.length === 0) return null;

  return results[Math.floor(Math.random() * results.length)];
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

export interface TmdbMovieExtras {
  trailerKey: string | null;
  director: string | null;
  cast: TmdbCastMember[];
  similar: TmdbSearchResult[];
  watchProviders: {
    flatrate: TmdbWatchProvider[];
    rent: TmdbWatchProvider[];
    buy: TmdbWatchProvider[];
    link: string | null;
  } | null;
}

export async function getMovieExtras(tmdbId: number): Promise<TmdbMovieExtras> {
  const data = await tmdbFetch(`/movie/${tmdbId}`, {
    append_to_response: 'videos,credits,similar,watch/providers',
  });

  const trailer = (data.videos?.results ?? []).find(
    (v: { site: string; type: string }) => v.site === 'YouTube' && v.type === 'Trailer'
  ) ?? (data.videos?.results ?? []).find((v: { site: string }) => v.site === 'YouTube');

  const director = (data.credits?.crew ?? []).find((c: { job: string }) => c.job === 'Director');

  const providersByRegion = data['watch/providers']?.results ?? {};
  const regionData = providersByRegion.RU ?? providersByRegion.US ?? Object.values(providersByRegion)[0];

  return {
    trailerKey: trailer?.key ?? null,
    director: director?.name ?? null,
    cast: (data.credits?.cast ?? []).slice(0, 8),
    similar: (data.similar?.results ?? []).slice(0, 8),
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
