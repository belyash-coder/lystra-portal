import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const RELEASES_LIMIT = 20;

interface MappedRelease {
  id: string;
  title: string;
  artist: string;
  cover: string;
  preview?: string;
}

// /editorial/{id}/releases существует, но всегда пустой (проверено вживую) —
// реальная подборка новых релизов по жанру лежит в /editorial/{id}/selection.
// ID из /genre и /editorial — одно и то же пространство идентификаторов
// (проверено: например 132 — это Pop в обоих списках).
async function fetchReleasesFor(editorialId: string | null): Promise<any[]> {
  const id = editorialId || '0';
  const res = await fetch(`https://api.deezer.com/editorial/${encodeURIComponent(id)}/selection`);
  if (!res.ok) throw new Error('Ошибка Deezer API');
  const data = await res.json();
  return data?.data || [];
}

// У релиза (альбома) в Deezer нет своего превью — оно есть только у треков,
// поэтому берём первый трек альбома и его превью показываем как превью
// релиза (аналогично тому, как уже сделано для превью в /api/spotify-mix).
async function attachPreview(release: any): Promise<MappedRelease> {
  let preview: string | undefined;
  try {
    const res = await fetch(`https://api.deezer.com/album/${release.id}`);
    if (res.ok) {
      const album = await res.json();
      preview = album?.tracks?.data?.[0]?.preview || undefined;
    }
  } catch {
    // превью не нашлось — отдаём релиз без него, кнопка воспроизведения на
    // фронте в этом случае просто неактивна
  }

  return {
    id: String(release.id),
    title: release.title,
    artist: release.artist?.name || 'Неизвестный исполнитель',
    cover: release.cover_big || release.cover_medium || release.cover || '',
    preview,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genreId = searchParams.get('genre_id');

  try {
    const releases = (await fetchReleasesFor(genreId)).slice(0, RELEASES_LIMIT);
    const withPreviews = await Promise.all(releases.map(attachPreview));
    return NextResponse.json(withPreviews, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Ошибка получения новых релизов:', error);
    return NextResponse.json({ error: 'Не удалось получить список релизов' }, { status: 500 });
  }
}
