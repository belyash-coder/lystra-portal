import {
  discoverCandidatePage,
  getExternalImdbId,
  type RandomDiscoverFilters,
  type TmdbSearchResult,
  type MediaType,
} from './tmdb';
import { getOmdbRating, getKinopoiskRating, passesRatingThreshold, type ExternalRating } from './ratings';

export type MediaTypeFilter = MediaType | 'any';

export interface HonestPick {
  movie: TmdbSearchResult;
  imdb: ExternalRating;
  kp: ExternalRating;
}

const MAX_PAGE_ATTEMPTS = 3;

async function fetchCandidates(mediaTypeFilter: MediaTypeFilter, filters: RandomDiscoverFilters): Promise<TmdbSearchResult[]> {
  if (mediaTypeFilter === 'any') {
    const [movies, tv] = await Promise.all([
      discoverCandidatePage('movie', filters),
      discoverCandidatePage('tv', filters),
    ]);
    return [...movies.results.slice(0, 10), ...tv.results.slice(0, 10)];
  }
  const { results } = await discoverCandidatePage(mediaTypeFilter, filters);
  return results;
}

export async function pickHonestRandomMovie(
  mediaTypeFilter: MediaTypeFilter,
  filters: RandomDiscoverFilters,
  minRating: number
): Promise<HonestPick | null> {
  for (let attempt = 0; attempt < MAX_PAGE_ATTEMPTS; attempt++) {
    const results = await fetchCandidates(mediaTypeFilter, filters);
    if (results.length === 0) continue;

    const withImdbId = await Promise.all(
      results.map(async (movie) => ({ movie, imdbId: await getExternalImdbId(movie.media_type, movie.id) }))
    );

    const rated = await Promise.all(
      withImdbId
        .filter((c): c is { movie: TmdbSearchResult; imdbId: string } => c.imdbId != null)
        .map(async ({ movie, imdbId }) => {
          const [imdb, kp] = await Promise.all([getOmdbRating(imdbId), getKinopoiskRating(imdbId)]);
          return { movie, imdb, kp };
        })
    );

    const passing = rated.filter((r) => passesRatingThreshold(minRating, r.imdb, r.kp));
    if (passing.length > 0) {
      return passing[Math.floor(Math.random() * passing.length)];
    }
  }

  return null;
}

export async function fetchDisplayRatings(
  mediaType: MediaType,
  tmdbId: number
): Promise<{ imdb: ExternalRating; kp: ExternalRating }> {
  const imdbId = await getExternalImdbId(mediaType, tmdbId);
  if (!imdbId) return { imdb: { rating: null, votes: null }, kp: { rating: null, votes: null } };
  const [imdb, kp] = await Promise.all([getOmdbRating(imdbId), getKinopoiskRating(imdbId)]);
  return { imdb, kp };
}
