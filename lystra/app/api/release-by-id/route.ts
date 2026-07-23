import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface MappedTrack {
  id: string;
  title: string;
  preview?: string;
}

interface MappedRelease {
  id: string;
  title: string;
  artist: string;
  cover: string;
  preview?: string;
  tracks: MappedTrack[];
  genre: string | null;
  year: number | null;
}

async function fetchFullAlbum(albumId: string): Promise<any | null> {
  try {
    const res = await fetch(`https://api.deezer.com/album/${albumId}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Отдаёт конкретный альбом Deezer по его ID напрямую - без похода в Last.fm,
// без случайного выбора. Нужен для диплинка "поделиться релизом": обычный
// /api/genre-release каждый раз даёт новый случайный альбом по тегу, а тут
// получателю ссылки должен открыться именно ТОТ ЖЕ альбом, что и у
// отправителя, поэтому идентифицируем релиз напрямую по id, не по жанру.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'Некорректный id релиза' }, { status: 400 });
  }

  try {
    const fullAlbum = await fetchFullAlbum(id);
    if (!fullAlbum) {
      return NextResponse.json({ error: 'Релиз не найден' }, { status: 404 });
    }

    const tracks: MappedTrack[] = (fullAlbum.tracks?.data || []).map((t: any) => ({
      id: String(t.id),
      title: t.title,
      preview: t.preview || undefined,
    }));

    const yearMatch = (fullAlbum.release_date || '').match(/^(\d{4})/);

    const release: MappedRelease = {
      id: `deezer-${fullAlbum.id}`,
      title: fullAlbum.title,
      artist: fullAlbum.artist?.name || '',
      cover: fullAlbum.cover_xl || fullAlbum.cover_big || fullAlbum.cover || '',
      preview: tracks.find((t) => t.preview)?.preview,
      tracks,
      genre: fullAlbum.genres?.data?.[0]?.name || null,
      year: yearMatch ? Number(yearMatch[1]) : null,
    };

    return NextResponse.json(release, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error: any) {
    console.error('Ошибка получения релиза по id:', error);
    return NextResponse.json({ error: error.message || 'Не удалось получить релиз' }, { status: 500 });
  }
}
