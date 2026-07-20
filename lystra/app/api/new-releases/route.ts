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

// ВАЖНО: Deezer нигде официально не документирует, что ID из /genre (список
// жанров, см. /api/new-releases/genres) и ID из /editorial (лента новых
// релизов по категориям) — это одно и то же пространство идентификаторов.
// На практике у их ~20 основных жанров эти ID совпадают (оба списка растут
// из одной и той же таксономии), но это не гарантировано контрактом API.
// Если после деплоя фильтр по жанру будет отдавать пустой список для
// реального genre_id — значит id-пространства разъехались, и здесь нужно
// явное сопоставление genre_id -> editorial_id.
async function fetchReleasesFor(editorialId: string | null): Promise<any[]> {
  const id = editorialId || '0';
  const res = await fetch(`https://api.deezer.com/editorial/${encodeURIComponent(id)}/releases`);
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
