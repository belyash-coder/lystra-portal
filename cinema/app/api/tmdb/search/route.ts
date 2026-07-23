import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth';
import { searchMulti, TMDB_POSTER_BASE } from '@/lib/tmdb';
import { attachLibraryInfo } from '@/lib/libraryLookup';

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
    const results = await searchMulti(query);
    const mapped = results.slice(0, 20).map((item) => ({
      tmdbId: item.id,
      mediaType: item.media_type,
      title: item.title,
      originalTitle: item.original_title,
      posterUrl: item.poster_path ? `${TMDB_POSTER_BASE}${item.poster_path}` : null,
      releaseYear: item.release_date ? Number(item.release_date.slice(0, 4)) : null,
      tmdbRating: item.vote_average,
    }));
    return NextResponse.json({ results: await attachLibraryInfo(profile.id, mapped) });
  } catch (error) {
    console.error('TMDB search error:', error);
    return NextResponse.json({ message: 'Ошибка поиска TMDB' }, { status: 502 });
  }
}
