import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentProfile } from '@/lib/auth';
import { getMovieDetails, TMDB_POSTER_BASE } from '@/lib/tmdb';
import type { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const genre = searchParams.get('genre');
  const search = searchParams.get('q');
  const listId = searchParams.get('listId');

  const where: Prisma.MovieWhereInput = {};
  if (genre) where.genres = { has: genre };
  if (search) where.title = { contains: search, mode: 'insensitive' };
  if (listId) where.listEntries = { some: { listId, list: { profileId: profile.id } } };

  const movies = await prisma.movie.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      addedBy: { select: { id: true, firstName: true, username: true } },
      watchEntries: { where: { profileId: profile.id } },
    },
  });

  const result = movies.map((movie) => {
    const entry = movie.watchEntries[0] ?? null;
    return {
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
    };
  });

  return NextResponse.json({ movies: result });
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { tmdbId } = await request.json();
  if (!tmdbId || typeof tmdbId !== 'number') {
    return NextResponse.json({ message: 'tmdbId обязателен' }, { status: 400 });
  }

  try {
    let movie = await prisma.movie.findUnique({ where: { tmdbId } });

    if (!movie) {
      const details = await getMovieDetails(tmdbId);
      movie = await prisma.movie.create({
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
          addedById: profile.id,
        },
      });
    }

    await prisma.watchEntry.upsert({
      where: { profileId_movieId: { profileId: profile.id, movieId: movie.id } },
      create: { profileId: profile.id, movieId: movie.id, status: 'PLANNED' },
      update: {},
    });

    return NextResponse.json({ movie }, { status: 201 });
  } catch (error) {
    console.error('Add movie error:', error);
    return NextResponse.json({ message: 'Не удалось добавить фильм' }, { status: 502 });
  }
}
