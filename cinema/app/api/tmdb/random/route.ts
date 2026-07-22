import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth';
import { randomDiscoverMovie, TMDB_POSTER_BASE } from '@/lib/tmdb';
import { attachLibraryInfo } from '@/lib/libraryLookup';

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const genreId = searchParams.get('genreId') ?? undefined;
  const countryCode = searchParams.get('country') ?? undefined;
  const yearFrom = searchParams.get('yearFrom') ?? undefined;
  const yearTo = searchParams.get('yearTo') ?? undefined;
  const minRating = searchParams.get('minRating') ?? undefined;

  try {
    const movie = await randomDiscoverMovie({ genreId, countryCode, yearFrom, yearTo, minRating });
    if (!movie) {
      return NextResponse.json({ movie: null });
    }

    const mapped = {
      tmdbId: movie.id,
      title: movie.title,
      originalTitle: movie.original_title,
      posterUrl: movie.poster_path ? `${TMDB_POSTER_BASE}${movie.poster_path}` : null,
      releaseYear: movie.release_date ? Number(movie.release_date.slice(0, 4)) : null,
      tmdbRating: movie.vote_average,
    };
    const [enriched] = await attachLibraryInfo(profile.id, [mapped]);

    return NextResponse.json({ movie: enriched });
  } catch (error) {
    console.error('TMDB random discover error:', error);
    return NextResponse.json({ message: 'Ошибка запроса к TMDB' }, { status: 502 });
  }
}
