import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth';
import { searchMovies, TMDB_POSTER_BASE } from '@/lib/tmdb';

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchMovies(query);
    return NextResponse.json({
      results: results.slice(0, 12).map((movie) => ({
        tmdbId: movie.id,
        title: movie.title,
        originalTitle: movie.original_title,
        posterUrl: movie.poster_path ? `${TMDB_POSTER_BASE}${movie.poster_path}` : null,
        releaseYear: movie.release_date ? Number(movie.release_date.slice(0, 4)) : null,
        tmdbRating: movie.vote_average,
      })),
    });
  } catch (error) {
    console.error('TMDB search error:', error);
    return NextResponse.json({ message: 'Ошибка поиска TMDB' }, { status: 502 });
  }
}
