import { prisma } from './prisma';
import { getMovieDetails } from './tmdb';

export async function ensureMovieCatalogued(tmdbId: number, addedById: string) {
  const existing = await prisma.movie.findUnique({ where: { tmdbId } });
  if (existing) return existing;

  const details = await getMovieDetails(tmdbId);
  return prisma.movie.create({
    data: {
      tmdbId: details.id,
      title: details.title,
      originalTitle: details.original_title,
      posterPath: details.poster_path,
      overview: details.overview,
      releaseYear: details.release_date ? Number(details.release_date.slice(0, 4)) : null,
      runtime: details.runtime,
      tmdbRating: details.vote_average,
      genres: details.genres.map((g) => g.name),
      addedById,
    },
  });
}
