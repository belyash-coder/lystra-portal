import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth';
import { fetchDisplayRatings } from '@/lib/honestRandomizer';
import type { MediaType } from '@/lib/tmdb';

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tmdbId = Number(searchParams.get('tmdbId'));
  const mediaTypeParam = searchParams.get('mediaType');
  const mediaType: MediaType = mediaTypeParam === 'tv' ? 'tv' : 'movie';

  if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
    return NextResponse.json({ message: 'Некорректный tmdbId' }, { status: 400 });
  }

  try {
    const { imdb, kp } = await fetchDisplayRatings(mediaType, tmdbId);
    return NextResponse.json({ imdb, kp });
  } catch (error) {
    console.error('Ratings fetch error:', error);
    return NextResponse.json({ message: 'Ошибка запроса рейтингов' }, { status: 502 });
  }
}
