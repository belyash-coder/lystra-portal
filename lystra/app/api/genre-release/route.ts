import { NextResponse } from 'next/server';
import { getFallbackTag, fetchLastfmTopArtists, fetchLastfmTagArtistPageCount, searchDeezerArtist } from '@/lib/lastfmGenre';

export const dynamic = 'force-dynamic';

const MAX_MATCH_ATTEMPTS = 15;
// Не уходим глубже условных "топ-1000 по тегу" - страницы намного дальше
// вершины чарта дают всё более редкую/криво размеченную разметку (ремиксы,
// трибьюты, опечатки в названии), которую Deezer хуже находит - жертвуем
// частью теоретического рандома ради того, чтобы вообще что-то находилось.
const MAX_LASTFM_PAGE_CAP = 20;
// Одной случайной страницы иногда не хватает (сама страница может оказаться
// без единого совпадения в Deezer) - даём тегу ещё одну попытку с ДРУГОЙ
// случайной страницей, прежде чем сдаваться и откатываться на более широкий
// жанровый тег.
const MAX_PAGE_ATTEMPTS = 2;

// search/artist у Deezer — нечёткий текстовый поиск: на неточном/неполном
// совпадении он может вместо пустого ответа подсунуть более раскрученного
// артиста с похожим или даже просто общим по звучанию именем (живой тест:
// "Glam Metal" внезапно обернулся "Cloud Rap"). Раньше это никак не
// проверялось - брали первый результат с непустым id. Теперь требуем, чтобы
// имя реально совпадало (без учёта регистра/диакритики/пунктуации), иначе
// это не тот артист, что дал нам Last.fm, а левый тёзка.
function normalizeArtistName(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

interface MatchedArtist {
  artist: any;
  albums: any[];
}

async function fetchArtistAlbums(artistId: number): Promise<any[]> {
  try {
    const res = await fetch(`https://api.deezer.com/artist/${artistId}/albums?limit=50`);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

async function fetchFullAlbum(albumId: number): Promise<any | null> {
  try {
    const res = await fetch(`https://api.deezer.com/album/${albumId}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Last.fm — фолксономия: кто угодно мог протегать артиста неточно, это в
// принципе не проверить (нет "правильного" ответа, есть только чужое
// мнение). Но грубый промах мимо целой ЖАНРОВОЙ СЕМЬИ (искали рок, а
// получили рэп/шансон/поп) можно поймать - у Deezer есть собственная
// жанровая классификация альбома (genres в ответе /album/{id}), уже
// используется в другом месте приложения (экран "Новинки"). Сверяем грубо,
// по семьям, а не точным поджанрам - Deezer и не различает "glam metal" от
// "nu metal", только широкие категории вроде "Rock"/"Metal".
const GENRE_FAMILY_KEYWORDS: Record<string, string[]> = {
  rock: ['rock', 'metal', 'punk', 'grunge', 'emo', 'hardcore', 'screamo', 'shoegaze', 'gothic'],
  rap: ['rap', 'hip hop', 'hiphop', 'trap', 'grime', 'drill'],
  pop: ['pop', 'k-pop', 'j-pop'],
  electronic: ['electro', 'techno', 'house', 'edm', 'trance', 'dubstep', 'drum and bass', 'dnb', 'ambient'],
  jazz: ['jazz'],
  classical: ['classical', 'orchestra', 'symphony', 'opera'],
  reggae: ['reggae', 'ska', 'dancehall', 'dub'],
  country: ['country', 'folk', 'bluegrass', 'americana'],
  blues: ['blues'],
  rnb: ['r&b', 'rnb', 'soul', 'funk'],
  latin: ['latin', 'reggaeton', 'salsa', 'bachata', 'cumbia', 'sierreno', 'norteno', 'corrido'],
  chanson: ['chanson', 'estrada', 'шансон'],
};

function guessGenreFamily(text: string): string | null {
  const lower = (text || '').toLowerCase();
  for (const [family, keywords] of Object.entries(GENRE_FAMILY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return family;
  }
  return null;
}

// requestedFamily=null - не смогли распознать семью запроса (нишевый жанр
// без явных ключевых слов) - тогда не отклоняем, доверяем Last.fm как раньше.
//
// Живой тест поймал явный промах, который раньше проходил незамеченным:
// "Russian Emo" вернул патриотический казачий хор ("80-летию Великой Победы
// посвящается", песни вроде "Ойся") - у этого обскурного релиза попросту не
// было жанровых данных в Deezer, а раньше отсутствие данных трактовалось как
// "нечем проверить - пропускаем". Теперь отсутствие данных - тоже отказ:
// нечем подтвердить соответствие жанру, значит не считаем это совпадением.
// Компромисс осознанный - вырастет процент честного "не найдено" на редких
// релизах без жанра в Deezer, даже если тег Last.fm был на самом деле верным.
function albumMatchesFamily(album: any, requestedFamily: string | null): boolean {
  if (!requestedFamily) return true;
  const deezerGenreNames: string[] = (album?.genres?.data || []).map((g: any) => g?.name || '');
  if (deezerGenreNames.length === 0) return false;
  return deezerGenreNames.some((name) => guessGenreFamily(name) === requestedFamily);
}

const MAX_ALBUM_GENRE_ATTEMPTS = 3;

async function tryTagPage(tag: string, totalPages: number, requestedFamily: string | null): Promise<MatchedArtist | null> {
  const page = 1 + Math.floor(Math.random() * Math.min(totalPages, MAX_LASTFM_PAGE_CAP));
  const candidates = await fetchLastfmTopArtists(tag, page);
  if (candidates.length === 0) return null;

  const shuffled = candidates.sort(() => Math.random() - 0.5).slice(0, MAX_MATCH_ATTEMPTS);
  const resolved = await Promise.all(shuffled.map((c) => searchDeezerArtist(c.name)));

  for (let i = 0; i < resolved.length; i++) {
    const found = resolved[i];
    if (!found?.id || isCompilationArtist(found.name)) continue;
    if (normalizeArtistName(found.name) !== normalizeArtistName(shuffled[i].name)) continue;

    // Раньше при отсутствии нормальных альбомов брали ЛЮБОЙ тип релиза -
    // живой тест показал, что это иногда подсовывает Deezer-сгенерированные
    // синтетические "Best of Артист (2017-2025)"-компиляции с кривыми/не
    // связанными с реальным артистом метаданными. Теперь если у артиста нет
    // ни одного настоящего альбома - это не тот кандидат, пробуем следующего.
    const albums = await fetchArtistAlbums(found.id);
    const properAlbums = albums.filter((a) => a.record_type === 'album');
    if (properAlbums.length === 0) continue;

    if (!requestedFamily) return { artist: found, albums: properAlbums };

    // Пробуем несколько альбомов этого артиста - ищем хотя бы один, чей
    // жанр в Deezer совпадает с ожидаемой жанровой семьёй запроса. У артиста
    // может быть несколько альбомов разных эпох/направлений - одного промаха
    // недостаточно, чтобы отвергать артиста целиком.
    const sampledAlbums = properAlbums.sort(() => Math.random() - 0.5).slice(0, MAX_ALBUM_GENRE_ATTEMPTS);
    const fetchedFull = await Promise.all(sampledAlbums.map((a) => fetchFullAlbum(a.id)));
    const verifiedIds = new Set(
      fetchedFull.filter((a) => a && albumMatchesFamily(a, requestedFamily)).map((a) => a.id)
    );
    const verifiedAlbums = sampledAlbums.filter((a) => verifiedIds.has(a.id));
    if (verifiedAlbums.length > 0) return { artist: found, albums: verifiedAlbums };
    // ни один сэмпл не подошёл по жанровой семье - не тот артист, следующий кандидат
  }
  return null;
}

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
  genre: string;
  year: number | null;
}

function isCompilationArtist(name: string): boolean {
  const normalized = (name || '').trim().toLowerCase();
  return normalized === 'various artists' || normalized === 'various' || normalized === 'v/a';
}

// Находим ОДНОГО реально существующего в Deezer артиста по жанровому тегу
// Last.fm (folksonomy Last.fm точнее ловит нишевые поджанры, чем родные теги
// Deezer) - через топ артистов тега, а не топ треков (см. fetchLastfmTopArtists
// выше). Страница выбирается по-настоящему случайно в пределах реального
// числа страниц у тега (а не угаданного диапазона) - для честного разнообразия.
async function findMatchedArtist(tag: string): Promise<MatchedArtist | null> {
  const totalPages = await fetchLastfmTagArtistPageCount(tag);
  if (totalPages === 0) return null;

  const requestedFamily = guessGenreFamily(tag);
  for (let attempt = 0; attempt < MAX_PAGE_ATTEMPTS; attempt++) {
    const match = await tryTagPage(tag, totalPages, requestedFamily);
    if (match) return match;
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get('genre');
  if (!genre) return NextResponse.json({ error: 'Жанр не указан' }, { status: 400 });

  try {
    let matched = await findMatchedArtist(genre);

    // По точному тегу никого не нашли - пробуем более широкий жанровый тег.
    // allowRegionalStrip=false - в отличие от spotify-mix, здесь НЕЛЬЗЯ тихо
    // отрезать национальность ("Russian Rock" -> "Rock"): это была бы не
    // деградация до более широкого жанра, а подмена страны без предупреждения.
    // Если единственный доступный fallback именно про это - лучше честно
    // "не найдено".
    let usedTag = genre;
    if (!matched) {
      const fallbackTag = getFallbackTag(genre, false);
      if (fallbackTag) {
        matched = await findMatchedArtist(fallbackTag);
        usedTag = fallbackTag;
      }
    }

    if (!matched) {
      return NextResponse.json({ error: 'Ничего не найдено по этому жанру' }, { status: 404 });
    }

    const picked = matched.albums[Math.floor(Math.random() * matched.albums.length)];

    const fullAlbum = await fetchFullAlbum(picked.id);
    if (!fullAlbum) {
      return NextResponse.json({ error: 'Не удалось загрузить альбом' }, { status: 404 });
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
      artist: fullAlbum.artist?.name || matched.artist.name,
      cover: fullAlbum.cover_xl || fullAlbum.cover_big || fullAlbum.cover || '',
      preview: tracks.find((t) => t.preview)?.preview,
      tracks,
      genre: usedTag,
      year: yearMatch ? Number(yearMatch[1]) : null,
    };

    return NextResponse.json(release, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error: any) {
    console.error('Ошибка получения случайного релиза по жанру:', error);
    return NextResponse.json({ error: error.message || 'Не удалось получить релиз' }, { status: 500 });
  }
}
