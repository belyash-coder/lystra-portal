import { prisma } from './prisma';
import { getTitleDetails, type MediaType } from './tmdb';

function toPrismaMediaType(mediaType: MediaType): 'MOVIE' | 'TV' {
  return mediaType === 'movie' ? 'MOVIE' : 'TV';
}

export async function ensureMovieCatalogued(mediaType: MediaType, tmdbId: number, addedById: string) {
  const prismaMediaType = toPrismaMediaType(mediaType);
  const existing = await prisma.movie.findUnique({
    where: { tmdbId_mediaType: { tmdbId, mediaType: prismaMediaType } },
  });
  if (existing) return existing;

  const details = await getTitleDetails(mediaType, tmdbId);
  return prisma.movie.create({
    data: {
      mediaType: prismaMediaType,
      tmdbId: details.id,
      title: details.title,
      originalTitle: details.original_title,
      posterPath: details.poster_path,
      overview: details.overview,
      releaseYear: details.release_date ? Number(details.release_date.slice(0, 4)) : null,
      runtime: details.runtime,
      numberOfSeasons: details.numberOfSeasons,
      numberOfEpisodes: details.numberOfEpisodes,
      tmdbRating: details.vote_average,
      genres: details.genres.map((g) => g.name),
      addedById,
    },
  });
}
