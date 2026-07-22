import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DISCOGS_USER_AGENT = 'LystraApp/1.0 +https://lystramusic.com';
const MAX_DEEZER_ATTEMPTS = 3;

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
  year: number | null;
  country: string | null;
  genre: string | null;
  discogsUrl: string;
  deezerMatched: boolean;
}

function getDiscogsToken(): string {
  const token = process.env.DISCOGS_TOKEN;
  if (!token) throw new Error('DISCOGS_TOKEN не настроен');
  return token;
}

async function discogsFetch(params: URLSearchParams) {
  const res = await fetch(`https://api.discogs.com/database/search?${params.toString()}`, {
    headers: {
      'User-Agent': DISCOGS_USER_AGENT,
      Authorization: `Discogs token=${getDiscogsToken()}`,
    },
  });
  if (!res.ok) throw new Error(`Discogs ответил ${res.status}`);
  return res.json();
}

// Название в поиске Discogs приходит одной строкой вида "Артист - Альбом" —
// у сборников/составных названий это грубое приближение, но для рулетки
// достаточно.
function splitArtistTitle(raw: string): { artist: string; title: string } {
  const idx = raw.indexOf(' - ');
  if (idx === -1) return { artist: 'Unknown Artist', title: raw };
  return { artist: raw.slice(0, idx).trim(), title: raw.slice(idx + 3).trim() };
}

// У Discogs имена артистов с несколькими одноимёнными исполнителями идут с
// дизамбигуацией вида "Boston (2)" — для поиска в Deezer это только мешает.
function cleanArtistName(name: string): string {
  return name.replace(/\s*\(\d+\)\s*$/, '').trim();
}

async function findRandomDiscogsRelease(genre: string | null, country: string | null, year: number | null) {
  // Тип поиска: если фильтруем по стране, страна — атрибут конкретного
  // тиража, у мастер-релизов (type=master) её нет. Без фильтра по стране
  // ищем среди мастер-релизов — так один альбом с кучей переизданий не
  // выпадает в рандоме в разы чаще, чем альбом с одним тиражом.
  const searchType = country ? 'release' : 'master';

  const baseParams = new URLSearchParams({ type: searchType, per_page: '1', page: '1' });
  if (genre) baseParams.set('genre', genre);
  if (country) baseParams.set('country', country);
  if (year) baseParams.set('year', String(year));

  const first = await discogsFetch(baseParams);
  const totalPages: number = first?.pagination?.pages || 0;
  if (totalPages === 0) return null;

  const randomPage = 1 + Math.floor(Math.random() * totalPages);
  const params = new URLSearchParams(baseParams);
  params.set('page', String(randomPage));
  const picked = await discogsFetch(params);
  return picked?.results?.[0] || null;
}

async function searchDeezerAlbum(artist: string, title: string) {
  const q = `artist:"${artist}" album:"${title}"`;
  const res = await fetch(`https://api.deezer.com/search/album?q=${encodeURIComponent(q)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data?.[0] || null;
}

async function attachDeezerTracks(albumId: string): Promise<MappedTrack[]> {
  try {
    const res = await fetch(`https://api.deezer.com/album/${albumId}`);
    if (!res.ok) return [];
    const album = await res.json();
    return (album?.tracks?.data || []).map((t: any) => ({
      id: String(t.id),
      title: t.title,
      preview: t.preview || undefined,
    }));
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get('genre');
  const country = searchParams.get('country');
  const yearFrom = Number(searchParams.get('year_from')) || null;
  const yearTo = Number(searchParams.get('year_to')) || null;

  try {
    getDiscogsToken();
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Диапазон лет сводим к одному случайному году - Discogs фильтрует по
  // точному году, а не по диапазону.
  const year = yearFrom && yearTo ? yearFrom + Math.floor(Math.random() * (yearTo - yearFrom + 1)) : yearFrom || yearTo || null;

  try {
    let discogsRelease: any = null;
    let deezerAlbum: any = null;

    for (let attempt = 0; attempt < MAX_DEEZER_ATTEMPTS; attempt++) {
      const picked = await findRandomDiscogsRelease(genre, country, year);
      if (!picked) {
        // На первой попытке это значит "по фильтрам вообще ничего нет" -
        // дальше пробовать бессмысленно. На повторных попытках (после уже
        // найденного discogsRelease) просто останавливаемся на том, что
        // есть без Deezer.
        if (!discogsRelease) return NextResponse.json({ error: 'Ничего не найдено по этим фильтрам' }, { status: 404 });
        break;
      }
      discogsRelease = picked;
      const { artist, title } = splitArtistTitle(picked.title || '');
      deezerAlbum = await searchDeezerAlbum(cleanArtistName(artist), title);
      if (deezerAlbum) break;
    }

    if (!discogsRelease) {
      return NextResponse.json({ error: 'Ничего не найдено по этим фильтрам' }, { status: 404 });
    }

    const { artist, title } = splitArtistTitle(discogsRelease.title || '');
    const tracks = deezerAlbum ? await attachDeezerTracks(String(deezerAlbum.id)) : [];

    const release: MappedRelease = {
      id: deezerAlbum ? `deezer-${deezerAlbum.id}` : `discogs-${discogsRelease.id}`,
      title: deezerAlbum?.title || title,
      artist: deezerAlbum?.artist?.name || cleanArtistName(artist),
      cover: deezerAlbum?.cover_big || deezerAlbum?.cover_medium || discogsRelease.cover_image || discogsRelease.thumb || '',
      preview: tracks[0]?.preview,
      tracks,
      year: discogsRelease.year || null,
      country: discogsRelease.country || null,
      genre: discogsRelease.genre?.[0] || genre || null,
      discogsUrl: discogsRelease.resource_url ? discogsRelease.resource_url.replace('api.discogs.com/releases', 'www.discogs.com/release').replace('api.discogs.com/masters', 'www.discogs.com/master') : '',
      deezerMatched: !!deezerAlbum,
    };

    return NextResponse.json(release, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error: any) {
    console.error('Ошибка получения случайного релиза:', error);
    return NextResponse.json({ error: error.message || 'Не удалось получить релиз' }, { status: 500 });
  }
}
