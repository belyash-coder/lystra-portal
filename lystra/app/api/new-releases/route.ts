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
// НО: /selection на один конкретный жанр — фиксированная курируемая подборка
// (~10 штук), не подчиняется ни index/offset, ни увеличенному limit (тоже
// проверено вживую). Для источника "chart" (/chart/{id}/albums) пагинация
// РЕАЛЬНО работает, но это уже не строго новинки, а топ по популярности —
// смешивает старую классику с новым (на фронте это отдельная кнопка
// "Популярное в жанре", а не часть общей подгрузки).
async function fetchReleasesForGenre(editorialId: string, offset: number, limit: number, source: 'selection' | 'chart'): Promise<any[]> {
  const path = source === 'chart' ? `chart/${encodeURIComponent(editorialId)}/albums` : `editorial/${encodeURIComponent(editorialId)}/selection`;
  const res = await fetch(`https://api.deezer.com/${path}?index=${offset}&limit=${limit}`);
  if (!res.ok) throw new Error('Ошибка Deezer API');
  const data = await res.json();
  return data?.data || [];
}

async function fetchAllGenreIds(): Promise<string[]> {
  try {
    const res = await fetch('https://api.deezer.com/genre');
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data || []).filter((g: any) => g.id !== 0).map((g: any) => String(g.id));
  } catch {
    return [];
  }
}

// Без выбранного жанра ("Все") один запрос к /editorial/0/selection тоже
// даёт лишь ~10 штук — тот же потолок, что и у одного конкретного жанра.
// Чтобы получить заметно больше материала и подгрузку без повторов, собираем
// /selection каждого реального жанра параллельно и объединяем с
// дедупликацией по id альбома — дальше просто режем получившийся массив по
// offset/limit, это уже настоящая постраничная подгрузка.
async function fetchAllGenresReleases(): Promise<any[]> {
  const genreIds = await fetchAllGenreIds();
  const perGenre = await Promise.all(
    genreIds.map((id) =>
      fetch(`https://api.deezer.com/editorial/${encodeURIComponent(id)}/selection`)
        .then((res) => (res.ok ? res.json() : { data: [] }))
        .then((data) => data?.data || [])
        .catch(() => [])
    )
  );

  const seen = new Set<string>();
  const merged: any[] = [];
  for (const release of perGenre.flat()) {
    const id = String(release.id);
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(release);
  }
  return merged;
}

async function fetchReleasesFor(editorialId: string | null, offset: number, limit: number, source: 'selection' | 'chart'): Promise<any[]> {
  if (!editorialId && source === 'selection') {
    const merged = await fetchAllGenresReleases();
    return merged.slice(offset, offset + limit);
  }
  return fetchReleasesForGenre(editorialId || '0', offset, limit, source);
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
  const source = searchParams.get('source') === 'chart' ? 'chart' : 'selection';

  try {
    const releases = await fetchReleasesFor(genreId, offset, limit, source);
    const withTracks = await Promise.all(releases.map(attachTracks));
    return NextResponse.json(withTracks, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Ошибка получения новых релизов:', error);
    return NextResponse.json({ error: 'Не удалось получить список релизов' }, { status: 500 });
  }
}
