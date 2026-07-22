import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth';
import { randomDiscoverMovie, TMDB_POSTER_BASE } from '@/lib/tmdb';

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const genreId = searchParams.get('genreId') ?? undefined;
  const yearFrom = searchParams.get('yearFrom') ?? undefined;
  const yearTo = searchParams.get('yearTo') ?? undefined;
  const minRating = searchParams.get('minRating') ?? undefined;

  try {
    const movie = await randomDiscoverMovie({ genreId, yearFrom, yearTo, minRating });
    if (!movie) {
      return NextResponse.json({ movie: null });
    }

    return NextResponse.json({
      movie: {
        tmdbId: movie.id,
        title: movie.title,
        originalTitle: movie.original_title,
        posterUrl: movie.poster_path ? `${TMDB_POSTER_BASE}${movie.poster_path}` : null,
        releaseYear: movie.release_date ? Number(movie.release_date.slice(0, 4)) : null,
        tmdbRating: movie.vote_average,
      },
    });
  } catch (error) {
    console.error('TMDB random discover error:', error);
    return NextResponse.json({ message: 'Ошибка запроса к TMDB' }, { status: 502 });
  }
}
