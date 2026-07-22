import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DISCOGS_USER_AGENT = 'LystraApp/1.0 +https://lystramusic.com';
// Без фильтра по стране ищем среди master-релизов - там пул отфильтрован от
// вала мелких/самиздатовских тиражей, и совпадение в Deezer находится почти
// всегда с первой-второй попытки. С фильтром по стране приходится искать
// среди type=release (у мастеров нет своей страны), а там до половины
// результатов - неизвестные Deezer локальные/самиздатовские издания, поэтому
// даём больше попыток, прежде чем сдаться.
const MAX_DEEZER_ATTEMPTS_DEFAULT = 3;
const MAX_DEEZER_ATTEMPTS_WITH_COUNTRY = 6;

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
  style: string | null;
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

// Сборники ("Various Artists") нет смысла искать в Deezer по артисту+
// названию — точного совпадения там всё равно почти никогда не будет, а
// нечёткий поиск Deezer вместо честного "не найдено" подсовывает случайный
// левый сборник с похожими словами в названии.
function isCompilationArtist(artist: string): boolean {
  const normalized = artist.trim().toLowerCase();
  return normalized === 'various' || normalized === 'v/a' || normalized.startsWith('various ');
}

// Общие служебные слова не считаются пересечением сами по себе - иначе два
// совершенно разных названия ("Something The Great" и "The Other Thing")
// засчитываются как "похожие" только потому что в обоих есть "the".
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'of', 'in', 'on', 'to', 'is', 'are', 'was', 'this',
  'that', 'with', 'from', 'by', 'at', 'an', 'as', 'be', 'or', 'but', 'not',
  'all', 'one', 'you', 'his', 'her', 'its', 'part', 'vol', 'volume',
]);

function normalizeWords(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9а-яё\s]/gi, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
  );
}

// У Deezer поиск нечёткий — на редких/составных названиях он может вместо
// пустого ответа вернуть что-то отдалённо похожее. Раньше считали совпадением
// пересечение хотя бы по одному из двух полей (артист ИЛИ название) - этого
// хватало для одного случайного общего слова, из-за чего на изолированных
// фильтрах (без второго "якоря" вроде страны+жанра вместе) периодически
// проскакивал совершенно левый альбом. Теперь требуем пересечения СРАЗУ по
// обоим полям, иначе считаем это "не нашли" и пробуем другой релиз.
function isPlausibleMatch(searchArtist: string, searchTitle: string, deezerAlbum: any): boolean {
  const wantedArtist = normalizeWords(searchArtist);
  const wantedTitle = normalizeWords(searchTitle);

  // normalizeWords вырезает все символы кроме латиницы/кириллицы - у полностью
  // иероглифических названий (японский, китайский и т.п.) после этого не
  // остаётся вообще ни одного слова для сравнения. Раньше это ошибочно
  // считалось "автоматическим совпадением" (нечего сравнивать = сойдёт),
  // из-за чего для таких релизов Deezer мог подсунуть вообще что угодно без
  // всякой проверки. Раз сравнивать реально нечего - не рискуем и считаем
  // совпадение недостоверным.
  if (wantedArtist.size === 0 && wantedTitle.size === 0) return false;

  const gotArtist = normalizeWords(deezerAlbum?.artist?.name || '');
  const gotTitle = normalizeWords(deezerAlbum?.title || '');
  const artistOverlap = wantedArtist.size === 0 || [...wantedArtist].some((w) => gotArtist.has(w));
  const titleOverlap = wantedTitle.size === 0 || [...wantedTitle].some((w) => gotTitle.has(w));
  return artistOverlap && titleOverlap;
}

async function findRandomDiscogsRelease(genre: string | null, style: string | null, country: string | null, year: number | null) {
  // Тип поиска: если фильтруем по стране, страна — атрибут конкретного
  // тиража, у мастер-релизов (type=master) её нет. Без фильтра по стране
  // ищем среди мастер-релизов — так один альбом с кучей переизданий не
  // выпадает в рандоме в разы чаще, чем альбом с одним тиражом.
  const searchType = country ? 'release' : 'master';

  // _exact - это то, что реально использует поиск на сайте Discogs для
  // строгой фильтрации по facet-полю (проверено вживую: обычный genre/
  // country вместо точной фильтрации даёт куда более смутный результат,
  // из-за чего валидные комбинации фильтров ошибочно выглядели пустыми).
  const baseParams = new URLSearchParams({ type: searchType, per_page: '1', page: '1' });
  if (genre) baseParams.set('genre_exact', genre);
  if (style) baseParams.set('style_exact', style);
  if (country) baseParams.set('country_exact', country);
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
  const style = searchParams.get('style');
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
    const maxAttempts = country ? MAX_DEEZER_ATTEMPTS_WITH_COUNTRY : MAX_DEEZER_ATTEMPTS_DEFAULT;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const picked = await findRandomDiscogsRelease(genre, style, country, year);
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
      if (isCompilationArtist(artist)) {
        deezerAlbum = null;
        continue;
      }
      const cleanedArtist = cleanArtistName(artist);
      const found = await searchDeezerAlbum(cleanedArtist, title);
      if (found && isPlausibleMatch(cleanedArtist, title, found)) {
        deezerAlbum = found;
        break;
      }
      deezerAlbum = null;
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
      // Показываем именно запрошенный жанр, если он был - у релиза в Discogs
      // часто несколько тегов жанра сразу, и "первый в массиве" может
      // оказаться вообще не тем, по которому фильтровали.
      genre: genre || discogsRelease.genre?.[0] || null,
      style: style || discogsRelease.style?.[0] || null,
      discogsUrl: discogsRelease.resource_url ? discogsRelease.resource_url.replace('api.discogs.com/releases', 'www.discogs.com/release').replace('api.discogs.com/masters', 'www.discogs.com/master') : '',
      deezerMatched: !!deezerAlbum,
    };

    return NextResponse.json(release, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error: any) {
    console.error('Ошибка получения случайного релиза:', error);
    return NextResponse.json({ error: error.message || 'Не удалось получить релиз' }, { status: 500 });
  }
}
