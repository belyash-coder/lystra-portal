import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth';
import { getGenreList } from '@/lib/tmdb';

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mediaType = searchParams.get('mediaType') === 'tv' ? 'tv' : 'movie';

  try {
    const genres = await getGenreList(mediaType);
    return NextResponse.json({ genres });
  } catch (error) {
    console.error('TMDB genres error:', error);
    return NextResponse.json({ message: 'Ошибка запроса к TMDB' }, { status: 502 });
  }
}
