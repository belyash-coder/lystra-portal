import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Discogs честно фильтрует facet-поля (genre_exact/country_exact) через
// поиск, но при этом "country" у релиза — это страна КОНКРЕТНОЙ пластинки
// (где прессовали/издавали), а не страна происхождения группы. Отсюда и был
// баг "Rock/Russia выдаёт только иностранные релизы" — русская группа с
// изданием в Германии проходила под country=Germany, а не Russia. У
// MusicBrainz же есть отдельное поле country именно у АРТИСТА (откуда он
// родом), и жанры/теги там — курируемый список, а не вольные ключевые слова
// Discogs. Меняем источник данных полностью: сначала находим артиста по
// стране+жанру/стилю, затем берём случайный релиз именно у него.
const MB_BASE = 'https://musicbrainz.org/ws/2';
const MB_USER_AGENT = 'LystraApp/1.0 ( https://lystramusic.com )';
// Публичный сервер MusicBrainz просит не чаще 1 запроса в секунду.
const MB_MIN_INTERVAL_MS = 1100;
let lastMbCallAt = 0;

const ARTIST_BATCH_SIZE = 20;
const MAX_ARTIST_ATTEMPTS = 4;
const MAX_DEEZER_ATTEMPTS = 4;

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
  sourceUrl: string;
  deezerMatched: boolean;
}

// Наши макро-жанры (см. tma/src/lib/discogsGenres.ts) — это категории
// Discogs, у MusicBrainz своя курируемая таксономия тегов/жанров. Переводим
// в один или несколько тегов MusicBrainz (через OR), а не полагаемся на
// точное текстовое совпадение строки.
const GENRE_TAGS: Record<string, string[]> = {
  Blues: ['blues'],
  'Brass & Military': ['brass band', 'military'],
  "Children's": ["children's music"],
  Classical: ['classical'],
  Electronic: ['electronic'],
  'Folk, World, & Country': ['folk', 'world music', 'country'],
  'Funk / Soul': ['funk', 'soul'],
  'Hip Hop': ['hip hop'],
  Jazz: ['jazz'],
  Latin: ['latin'],
  'Non-Music': ['spoken word', 'comedy'],
  Pop: ['pop'],
  Reggae: ['reggae'],
  Rock: ['rock'],
  'Stage & Screen': ['soundtrack'],
};

// Соответствие наших строк страны (tma/src/lib/discogsCountries.ts) ISO
// 3166-1 alpha-2 кодам — именно так у MusicBrainz хранится country артиста.
const COUNTRY_ISO: Record<string, string> = {
  UK: 'GB',
  US: 'US',
  Germany: 'DE',
  France: 'FR',
  Italy: 'IT',
  Spain: 'ES',
  Netherlands: 'NL',
  Belgium: 'BE',
  Sweden: 'SE',
  Norway: 'NO',
  Denmark: 'DK',
  Finland: 'FI',
  Iceland: 'IS',
  Poland: 'PL',
  Russia: 'RU',
  USSR: 'SU',
  Ukraine: 'UA',
  Belarus: 'BY',
  Czechoslovakia: 'CS',
  'Czech Republic': 'CZ',
  Austria: 'AT',
  Switzerland: 'CH',
  Portugal: 'PT',
  Greece: 'GR',
  Turkey: 'TR',
  Ireland: 'IE',
  Japan: 'JP',
  'South Korea': 'KR',
  China: 'CN',
  India: 'IN',
  Canada: 'CA',
  Australia: 'AU',
  'New Zealand': 'NZ',
  Brazil: 'BR',
  Argentina: 'AR',
  Mexico: 'MX',
  Chile: 'CL',
  Colombia: 'CO',
  Peru: 'PE',
  Cuba: 'CU',
  Jamaica: 'JM',
  'South Africa': 'ZA',
  Israel: 'IL',
  Egypt: 'EG',
  Nigeria: 'NG',
  Hungary: 'HU',
  Romania: 'RO',
  Bulgaria: 'BG',
  Serbia: 'RS',
  Croatia: 'HR',
  Slovenia: 'SI',
  Slovakia: 'SK',
  Lithuania: 'LT',
  Latvia: 'LV',
  Estonia: 'EE',
  Georgia: 'GE',
  Armenia: 'AM',
  Azerbaijan: 'AZ',
  Kazakhstan: 'KZ',
  Uzbekistan: 'UZ',
};
const ISO_TO_COUNTRY_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_ISO).map(([label, iso]) => [iso, label])
);

async function throttleMb() {
  const wait = MB_MIN_INTERVAL_MS - (Date.now() - lastMbCallAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastMbCallAt = Date.now();
}

async function mbFetch(path: string, params: URLSearchParams): Promise<any> {
  await throttleMb();
  const res = await fetch(`${MB_BASE}/${path}?${params.toString()}`, {
    headers: { 'User-Agent': MB_USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`MusicBrainz ответил ${res.status}`);
  return res.json();
}

// Сборники ("Various Artists") нет смысла разбирать по артисту+названию —
// см. isCompilationArtist в прежней версии этого файла (та же логика).
function isCompilationArtist(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return normalized === 'various artists' || normalized === 'various' || normalized === 'v/a';
}

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

// У Deezer поиск нечёткий и может вместо пустого ответа вернуть что-то
// отдалённо похожее — требуем пересечения СРАЗУ по артисту И названию, а на
// полностью нелатинских/некириллических (иероглифических) названиях, где
// сравнивать реально нечего, считаем совпадение недостоверным, а не
// автоматическим "проходом".
function isPlausibleMatch(searchArtist: string, searchTitle: string, deezerAlbum: any): boolean {
  const wantedArtist = normalizeWords(searchArtist);
  const wantedTitle = normalizeWords(searchTitle);
  if (wantedArtist.size === 0 && wantedTitle.size === 0) return false;

  const gotArtist = normalizeWords(deezerAlbum?.artist?.name || '');
  const gotTitle = normalizeWords(deezerAlbum?.title || '');
  const artistOverlap = wantedArtist.size === 0 || [...wantedArtist].some((w) => gotArtist.has(w));
  const titleOverlap = wantedTitle.size === 0 || [...wantedTitle].some((w) => gotTitle.has(w));
  return artistOverlap && titleOverlap;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildArtistQuery(isoCountry: string | null, tagTerms: string[], styleTerm: string | null): string {
  const clauses: string[] = [];
  if (isoCountry) clauses.push(`country:${isoCountry}`);
  if (tagTerms.length > 0) {
    const tagClause = tagTerms.map((t) => `tag:"${t}"`).join(' OR ');
    clauses.push(tagTerms.length > 1 ? `(${tagClause})` : tagClause);
  }
  if (styleTerm) clauses.push(`tag:"${styleTerm}"`);
  // Без единого фильтра "*" — известный приём MusicBrainz-сообщества для
  // "любой артист вообще", раз своего эндпоинта "случайный артист" у API нет.
  return clauses.length > 0 ? clauses.join(' AND ') : '*';
}

// Забираем случайную пачку артистов одним запросом (сначала узнаём общее
// количество, потом берём случайный сдвиг) — тот же приём, что и с пачкой
// кандидатов Discogs, просто теперь фильтр (страна/жанр) применяется
// сервером к полю, которое реально означает то, что нам нужно.
async function fetchArtistCandidates(query: string): Promise<any[]> {
  const countData = await mbFetch('artist', new URLSearchParams({ query, fmt: 'json', limit: '1' }));
  const count: number = countData?.count || 0;
  if (count === 0) return [];

  const maxOffset = Math.max(0, Math.min(count - 1, 400));
  const offset = Math.floor(Math.random() * (maxOffset + 1));
  const batchData = await mbFetch(
    'artist',
    new URLSearchParams({ query, fmt: 'json', limit: String(ARTIST_BATCH_SIZE), offset: String(offset) })
  );
  return shuffle(batchData?.artists || []);
}

// Локальная перепроверка — но, в отличие от Discogs, здесь country/tag это и
// есть поля, по которым реально фильтрует сам поиск, а не смутные facet'ы.
// Поэтому отклоняем только при явном расхождении с уже полученными данными,
// а не при отсутствии данных (отсутствие тегов в ответе — это пробел в
// разметке MusicBrainz, а не признак того, что жанр не подходит).
function artistMatchesFilters(artist: any, isoCountry: string | null, tagTerms: string[], styleTerm: string | null): boolean {
  if (isoCountry && artist.country && artist.country.toUpperCase() !== isoCountry.toUpperCase()) return false;
  const tags: string[] = (artist.tags || []).map((t: any) => (t.name || '').toLowerCase());
  if (tags.length > 0) {
    if (tagTerms.length > 0 && !tagTerms.some((t) => tags.includes(t.toLowerCase()))) return false;
    if (styleTerm && !tags.includes(styleTerm.toLowerCase())) return false;
  }
  return true;
}

async function fetchReleaseGroups(artistId: string): Promise<any[]> {
  const data = await mbFetch(
    'release-group',
    new URLSearchParams({ artist: artistId, type: 'album|ep', fmt: 'json', limit: '100' })
  );
  return data?.['release-groups'] || [];
}

function releaseGroupYear(rg: any): number | null {
  const match = (rg['first-release-date'] || '').match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
}

function yearInRange(year: number | null, yearFrom: number | null, yearTo: number | null): boolean {
  if (!yearFrom && !yearTo) return true;
  if (year === null) return false;
  if (yearFrom && year < yearFrom) return false;
  if (yearTo && year > yearTo) return false;
  return true;
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

// Если Deezer не нашёл альбом, берём обложку из Cover Art Archive
// (официальный архив обложек MusicBrainz) по mbid релиз-группы — он отдаёт
// 307-редирект на реальную картинку, поэтому просто следуем за ним.
async function fetchCoverArtArchiveCover(releaseGroupId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://coverartarchive.org/release-group/${releaseGroupId}/front-500`);
    if (!res.ok) return null;
    res.body?.cancel();
    return res.url || null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get('genre');
  const style = searchParams.get('style');
  const country = searchParams.get('country');
  const yearFrom = Number(searchParams.get('year_from')) || null;
  const yearTo = Number(searchParams.get('year_to')) || null;

  const isoCountry = country ? COUNTRY_ISO[country] || null : null;
  const tagTerms = genre ? GENRE_TAGS[genre] || [genre.toLowerCase()] : [];
  const styleTerm = style ? style.trim().toLowerCase() : null;

  try {
    const query = buildArtistQuery(isoCountry, tagTerms, styleTerm);
    const artists = await fetchArtistCandidates(query);
    if (artists.length === 0) {
      return NextResponse.json({ error: 'Ничего не найдено по этим фильтрам' }, { status: 404 });
    }

    for (const artist of artists.slice(0, MAX_ARTIST_ATTEMPTS)) {
      if (isCompilationArtist(artist.name || '')) continue;
      if (!artistMatchesFilters(artist, isoCountry, tagTerms, styleTerm)) continue;

      const releaseGroups = await fetchReleaseGroups(artist.id);
      const filtered = shuffle(releaseGroups.filter((rg) => yearInRange(releaseGroupYear(rg), yearFrom, yearTo)));
      if (filtered.length === 0) continue;

      let chosenRg = filtered[0];
      let deezerAlbum: any = null;
      for (const rg of filtered.slice(0, MAX_DEEZER_ATTEMPTS)) {
        const found = await searchDeezerAlbum(artist.name, rg.title);
        if (found && isPlausibleMatch(artist.name, rg.title, found)) {
          chosenRg = rg;
          deezerAlbum = found;
          break;
        }
      }

      const tracks = deezerAlbum ? await attachDeezerTracks(String(deezerAlbum.id)) : [];
      const cover = deezerAlbum?.cover_big || deezerAlbum?.cover_medium || (await fetchCoverArtArchiveCover(chosenRg.id)) || '';

      const release: MappedRelease = {
        id: deezerAlbum ? `deezer-${deezerAlbum.id}` : `mb-${chosenRg.id}`,
        title: deezerAlbum?.title || chosenRg.title,
        artist: deezerAlbum?.artist?.name || artist.name,
        cover,
        preview: tracks[0]?.preview,
        tracks,
        year: releaseGroupYear(chosenRg),
        country: (artist.country && ISO_TO_COUNTRY_LABEL[artist.country]) || artist.country || null,
        genre: genre || null,
        style: style || null,
        sourceUrl: `https://musicbrainz.org/release-group/${chosenRg.id}`,
        deezerMatched: !!deezerAlbum,
      };

      return NextResponse.json(release, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
    }

    return NextResponse.json({ error: 'Ничего не найдено по этим фильтрам' }, { status: 404 });
  } catch (error: any) {
    console.error('Ошибка получения случайного релиза:', error);
    return NextResponse.json({ error: error.message || 'Не удалось получить релиз' }, { status: 500 });
  }
}
