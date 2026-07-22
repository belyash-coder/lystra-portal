import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentProfile } from '@/lib/auth';
import { TMDB_POSTER_BASE } from '@/lib/tmdb';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { id } = await params;

  const movie = await prisma.movie.findUnique({
    where: { id },
    include: {
      addedBy: { select: { id: true, firstName: true, username: true } },
      watchEntries: { where: { profileId: profile.id } },
      listEntries: { where: { list: { profileId: profile.id } }, select: { listId: true } },
    },
  });

  if (!movie) {
    return NextResponse.json({ message: 'Фильм не найден' }, { status: 404 });
  }

  const entry = movie.watchEntries[0] ?? null;

  return NextResponse.json({
    movie: {
      id: movie.id,
      tmdbId: movie.tmdbId,
      title: movie.title,
      originalTitle: movie.originalTitle,
      posterUrl: movie.posterPath ? `${TMDB_POSTER_BASE}${movie.posterPath}` : null,
      overview: movie.overview,
      releaseYear: movie.releaseYear,
      runtime: movie.runtime,
      tmdbRating: movie.tmdbRating,
      genres: movie.genres,
      addedBy: movie.addedBy,
      status: entry?.status ?? 'PLANNED',
      rating: entry?.rating ?? null,
      listIds: movie.listEntries.map((e) => e.listId),
    },
  });
}
