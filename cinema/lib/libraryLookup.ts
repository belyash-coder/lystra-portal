import { prisma } from './prisma';

export interface LibraryInfo {
  libraryMovieId: string | null;
  inLibrary: boolean;
}

export async function attachLibraryInfo<T extends { tmdbId: number }>(
  profileId: string,
  items: T[]
): Promise<(T & LibraryInfo)[]> {
  if (items.length === 0) return [];

  const tmdbIds = items.map((item) => item.tmdbId);
  const movies = await prisma.movie.findMany({
    where: { tmdbId: { in: tmdbIds } },
    select: { id: true, tmdbId: true },
  });
  const movieIdByTmdbId = new Map(movies.map((m) => [m.tmdbId, m.id]));

  const movieIds = movies.map((m) => m.id);
  const entries = movieIds.length
    ? await prisma.watchEntry.findMany({
        where: { profileId, movieId: { in: movieIds } },
        select: { movieId: true },
      })
    : [];
  const moviesInLibrary = new Set(entries.map((e) => e.movieId));

  return items.map((item) => {
    const libraryMovieId = movieIdByTmdbId.get(item.tmdbId) ?? null;
    return {
      ...item,
      libraryMovieId,
      inLibrary: libraryMovieId != null && moviesInLibrary.has(libraryMovieId),
    };
  });
}
