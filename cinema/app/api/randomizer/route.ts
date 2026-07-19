import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentProfile } from '@/lib/auth';
import { TMDB_POSTER_BASE } from '@/lib/tmdb';
import type { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const genre = searchParams.get('genre');
  const excludeWatched = searchParams.get('excludeWatched') !== 'false';
  const yearFrom = searchParams.get('yearFrom');
  const yearTo = searchParams.get('yearTo');
  const exclude = searchParams.getAll('exclude');

  const where: Prisma.MovieWhereInput = {};
  if (genre) where.genres = { has: genre };
  if (yearFrom) where.releaseYear = { ...(where.releaseYear as object), gte: Number(yearFrom) };
  if (yearTo) where.releaseYear = { ...(where.releaseYear as object), lte: Number(yearTo) };
  if (exclude.length > 0) where.id = { notIn: exclude };

  const movies = await prisma.movie.findMany({
    where,
    include: {
      watchEntries: { where: { profileId: profile.id } },
    },
  });

  const candidates = movies.filter((movie) => {
    if (!excludeWatched) return true;
    const status = movie.watchEntries[0]?.status ?? 'PLANNED';
    return status !== 'WATCHED';
  });

  if (candidates.length === 0) {
    return NextResponse.json({ movie: null });
  }

  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  const entry = picked.watchEntries[0] ?? null;

  return NextResponse.json({
    movie: {
      id: picked.id,
      tmdbId: picked.tmdbId,
      title: picked.title,
      originalTitle: picked.originalTitle,
      posterUrl: picked.posterPath ? `${TMDB_POSTER_BASE}${picked.posterPath}` : null,
      overview: picked.overview,
      releaseYear: picked.releaseYear,
      runtime: picked.runtime,
      tmdbRating: picked.tmdbRating,
      genres: picked.genres,
      status: entry?.status ?? 'PLANNED',
      rating: entry?.rating ?? null,
    },
    candidateCount: candidates.length,
  });
}
