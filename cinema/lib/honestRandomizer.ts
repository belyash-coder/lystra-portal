import {
  discoverCandidatePage,
  getExternalImdbId,
  type RandomDiscoverFilters,
  type TmdbSearchResult,
} from './tmdb';
import { getOmdbRating, getKinopoiskRating, passesRatingThreshold, type ExternalRating } from './ratings';

export interface HonestPick {
  movie: TmdbSearchResult;
  imdb: ExternalRating;
  kp: ExternalRating;
}

const MAX_PAGE_ATTEMPTS = 3;

export async function pickHonestRandomMovie(
  filters: RandomDiscoverFilters,
  minRating: number
): Promise<HonestPick | null> {
  for (let attempt = 0; attempt < MAX_PAGE_ATTEMPTS; attempt++) {
    const { results } = await discoverCandidatePage(filters);
    if (results.length === 0) continue;

    const withImdbId = await Promise.all(
      results.map(async (movie) => ({ movie, imdbId: await getExternalImdbId(movie.id) }))
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

export async function fetchDisplayRatings(tmdbId: number): Promise<{ imdb: ExternalRating; kp: ExternalRating }> {
  const imdbId = await getExternalImdbId(tmdbId);
  if (!imdbId) return { imdb: { rating: null, votes: null }, kp: { rating: null, votes: null } };
  const [imdb, kp] = await Promise.all([getOmdbRating(imdbId), getKinopoiskRating(imdbId)]);
  return { imdb, kp };
}
