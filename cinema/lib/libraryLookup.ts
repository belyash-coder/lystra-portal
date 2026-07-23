import { prisma } from './prisma';
import type { MediaType } from './tmdb';

export interface LibraryInfo {
  libraryMovieId: string | null;
  inLibrary: boolean;
}

function toPrismaMediaType(mediaType: MediaType): 'MOVIE' | 'TV' {
  return mediaType === 'movie' ? 'MOVIE' : 'TV';
}

export async function attachLibraryInfo<T extends { tmdbId: number; mediaType: MediaType }>(
  profileId: string,
  items: T[]
): Promise<(T & LibraryInfo)[]> {
  if (items.length === 0) return [];

  const or = items.map((item) => ({ tmdbId: item.tmdbId, mediaType: toPrismaMediaType(item.mediaType) }));
  const movies = await prisma.movie.findMany({
    where: { OR: or },
    select: { id: true, tmdbId: true, mediaType: true },
  });
  const movieIdByKey = new Map(movies.map((m) => [`${m.mediaType}:${m.tmdbId}`, m.id]));

  const movieIds = movies.map((m) => m.id);
  const entries = movieIds.length
    ? await prisma.watchEntry.findMany({
        where: { profileId, movieId: { in: movieIds } },
        select: { movieId: true },
      })
    : [];
  const moviesInLibrary = new Set(entries.map((e) => e.movieId));

  return items.map((item) => {
    const key = `${toPrismaMediaType(item.mediaType)}:${item.tmdbId}`;
    const libraryMovieId = movieIdByKey.get(key) ?? null;
    return {
      ...item,
      libraryMovieId,
      inLibrary: libraryMovieId != null && moviesInLibrary.has(libraryMovieId),
    };
  });
}
