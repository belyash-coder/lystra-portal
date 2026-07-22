import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth';
import { ensureMovieCatalogued } from '@/lib/movieCatalog';

// Заносит фильм в общий каталог (таблица Movie), НЕ добавляя его в личную
// библиотеку профиля (WatchEntry не создаётся). Нужен только чтобы открыть
// страницу /movie/[id] для ещё не добавленного фильма.
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
    const movie = await ensureMovieCatalogued(tmdbId, profile.id);
    return NextResponse.json({ movieId: movie.id });
  } catch (error) {
    console.error('Catalog movie error:', error);
    return NextResponse.json({ message: 'Не удалось получить данные фильма' }, { status: 502 });
  }
}
