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

async function tryTagPage(tag: string, totalPages: number): Promise<MatchedArtist | null> {
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

    return { artist: found, albums: properAlbums };
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

  for (let attempt = 0; attempt < MAX_PAGE_ATTEMPTS; attempt++) {
    const match = await tryTagPage(tag, totalPages);
    if (match) return match;
  }
  return null;
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

    const release: MappedRelease = {
      id: `deezer-${fullAlbum.id}`,
      title: fullAlbum.title,
      artist: fullAlbum.artist?.name || matched.artist.name,
      cover: fullAlbum.cover_xl || fullAlbum.cover_big || fullAlbum.cover || '',
      preview: tracks.find((t) => t.preview)?.preview,
      tracks,
      genre: usedTag,
    };

    return NextResponse.json(release, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error: any) {
    console.error('Ошибка получения случайного релиза по жанру:', error);
    return NextResponse.json({ error: error.message || 'Не удалось получить релиз' }, { status: 500 });
  }
}
