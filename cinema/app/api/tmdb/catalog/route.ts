import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth';
import { ensureMovieCatalogued } from '@/lib/movieCatalog';
import type { MediaType } from '@/lib/tmdb';

// Заносит фильм/сериал в общий каталог (таблица Movie), НЕ добавляя его в личную
// библиотеку профиля (WatchEntry не создаётся). Нужен только чтобы открыть
// страницу /movie/[id] для ещё не добавленного тайтла.
export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { tmdbId, mediaType } = await request.json();
  if (!tmdbId || typeof tmdbId !== 'number') {
    return NextResponse.json({ message: 'tmdbId обязателен' }, { status: 400 });
  }
  const resolvedMediaType: MediaType = mediaType === 'tv' ? 'tv' : 'movie';

  try {
    const movie = await ensureMovieCatalogued(resolvedMediaType, tmdbId, profile.id);
    return NextResponse.json({ movieId: movie.id });
  } catch (error) {
    console.error('Catalog movie error:', error);
    return NextResponse.json({ message: 'Не удалось получить данные фильма' }, { status: 502 });
  }
}
