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

async function tryTagPage(tag: string, totalPages: number): Promise<any | null> {
  const page = 1 + Math.floor(Math.random() * Math.min(totalPages, MAX_LASTFM_PAGE_CAP));
  const candidates = await fetchLastfmTopArtists(tag, page);
  if (candidates.length === 0) return null;

  const shuffled = candidates.sort(() => Math.random() - 0.5).slice(0, MAX_MATCH_ATTEMPTS);
  const resolved = await Promise.all(shuffled.map((c) => searchDeezerArtist(c.name)));
  const match = resolved.find((a) => a?.id && !isCompilationArtist(a.name));
  return match || null;
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
async function findMatchedArtist(tag: string): Promise<any | null> {
  const totalPages = await fetchLastfmTagArtistPageCount(tag);
  if (totalPages === 0) return null;

  for (let attempt = 0; attempt < MAX_PAGE_ATTEMPTS; attempt++) {
    const match = await tryTagPage(tag, totalPages);
    if (match) return match;
  }
  return null;
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get('genre');
  if (!genre) return NextResponse.json({ error: 'Жанр не указан' }, { status: 400 });

  try {
    let artist = await findMatchedArtist(genre);

    // По точному тегу никого не нашли - пробуем более широкий жанровый тег.
    // allowRegionalStrip=false - в отличие от spotify-mix, здесь НЕЛЬЗЯ тихо
    // отрезать национальность ("Russian Rock" -> "Rock"): это была бы не
    // деградация до более широкого жанра, а подмена страны без предупреждения.
    // Если единственный доступный fallback именно про это - лучше честно
    // "не найдено".
    let usedTag = genre;
    if (!artist) {
      const fallbackTag = getFallbackTag(genre, false);
      if (fallbackTag) {
        artist = await findMatchedArtist(fallbackTag);
        usedTag = fallbackTag;
      }
    }

    if (!artist) {
      return NextResponse.json({ error: 'Ничего не найдено по этому жанру' }, { status: 404 });
    }

    const albums = await fetchArtistAlbums(artist.id);
    if (albums.length === 0) {
      return NextResponse.json({ error: 'У найденного артиста нет альбомов в Deezer' }, { status: 404 });
    }

    // Предпочитаем полноценные альбомы синглам/компиляциям, но если у артиста
    // их нет - берём что есть, лишь бы показать хоть что-то по этому жанру.
    const properAlbums = albums.filter((a) => a.record_type === 'album');
    const pool = properAlbums.length > 0 ? properAlbums : albums;
    const picked = pool[Math.floor(Math.random() * pool.length)];

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
      artist: fullAlbum.artist?.name || artist.name,
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
