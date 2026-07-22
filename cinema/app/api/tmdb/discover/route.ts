import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth';
import { discoverMovies, TMDB_POSTER_BASE, DISCOVER_CATEGORIES, type DiscoverCategory } from '@/lib/tmdb';
import { attachLibraryInfo } from '@/lib/libraryLookup';

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') as DiscoverCategory | null;
  const page = Number(searchParams.get('page') ?? '1');

  if (!category || !DISCOVER_CATEGORIES.includes(category)) {
    return NextResponse.json({ message: 'Некорректная категория' }, { status: 400 });
  }

  try {
    const results = await discoverMovies(category, page);
    const mapped = results.map((movie) => ({
      tmdbId: movie.id,
      title: movie.title,
      originalTitle: movie.original_title,
      posterUrl: movie.poster_path ? `${TMDB_POSTER_BASE}${movie.poster_path}` : null,
      releaseYear: movie.release_date ? Number(movie.release_date.slice(0, 4)) : null,
      tmdbRating: movie.vote_average,
    }));
    return NextResponse.json({ results: await attachLibraryInfo(profile.id, mapped) });
  } catch (error) {
    console.error('TMDB discover error:', error);
    return NextResponse.json({ message: 'Ошибка запроса к TMDB' }, { status: 502 });
  }
}
