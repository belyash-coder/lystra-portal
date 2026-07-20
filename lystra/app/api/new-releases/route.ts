import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFAULT_PAGE_SIZE = 10;

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
}

// /editorial/{id}/releases существует, но всегда пустой (проверено вживую) —
// реальная подборка новых релизов по жанру лежит в /editorial/{id}/selection.
// ID из /genre и /editorial — одно и то же пространство идентификаторов
// (проверено: например 132 — это Pop в обоих списках).
// Пагинация через index/limit — стандартные параметры Deezer для списковых
// эндпоинтов (как в /search, /chart и т.д.); для /selection именно так вживую
// не проверено — если "Ещё" на фронте будет грузить одно и то же, значит
// этот конкретный эндпоинт их не поддерживает и отдаёт только фиксированную
// подборку без постраничной подгрузки.
async function fetchReleasesFor(editorialId: string | null, offset: number, limit: number): Promise<any[]> {
  const id = editorialId || '0';
  const res = await fetch(`https://api.deezer.com/editorial/${encodeURIComponent(id)}/selection?index=${offset}&limit=${limit}`);
  if (!res.ok) throw new Error('Ошибка Deezer API');
  const data = await res.json();
  return data?.data || [];
}

// У релиза (альбома) в Deezer нет своего превью — оно есть только у треков,
// поэтому дёргаем полный трек-лист альбома и отдаём все треки (а не только
// первый) — на фронте релиз показывает список всех треков, как и у жанров.
async function attachTracks(release: any): Promise<MappedRelease> {
  let tracks: MappedTrack[] = [];
  try {
    const res = await fetch(`https://api.deezer.com/album/${release.id}`);
    if (res.ok) {
      const album = await res.json();
      tracks = (album?.tracks?.data || []).map((t: any) => ({
        id: String(t.id),
        title: t.title,
        preview: t.preview || undefined,
      }));
    }
  } catch {
    // треки не нашлись — отдаём релиз без них, кнопка воспроизведения на
    // фронте в этом случае просто неактивна
  }

  return {
    id: String(release.id),
    title: release.title,
    artist: release.artist?.name || 'Неизвестный исполнитель',
    cover: release.cover_big || release.cover_medium || release.cover || '',
    preview: tracks[0]?.preview,
    tracks,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genreId = searchParams.get('genre_id');
  const offset = Math.max(0, Number(searchParams.get('offset')) || 0);
  const limit = Math.max(1, Number(searchParams.get('limit')) || DEFAULT_PAGE_SIZE);

  try {
    const releases = await fetchReleasesFor(genreId, offset, limit);
    const withTracks = await Promise.all(releases.map(attachTracks));
    return NextResponse.json(withTracks, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Ошибка получения новых релизов:', error);
    return NextResponse.json({ error: 'Не удалось получить список релизов' }, { status: 500 });
  }
}
