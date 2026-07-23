import { NextResponse } from 'next/server';
import { getFallbackTag, fetchLastfmCandidates, findDeezerPreview } from '@/lib/lastfmGenre';

export const dynamic = 'force-dynamic';

const MAX_MATCH_ATTEMPTS = 15;
// Last.fm tag.gettoptracks без параметра page всегда отдаёт одну и ту же
// полусотню САМЫХ популярных треков тега - шафл внутри неё почти всегда
// выносит одних и тех же раскрученных исполнителей ("всегда только топы").
// Берём случайную страницу подальше от вершины чарта тега для разнообразия.
const MAX_LASTFM_PAGE = 10;

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

// Находим ОДИН реально существующий в Deezer трек по жанровому тегу Last.fm —
// та же логика, что и в spotify-mix (folksonomy Last.fm точнее ловит нишевые
// поджанры, чем родные теги Deezer), но нам нужен не список из 10 треков, а
// всего один надёжно подтверждённый артист, от которого дальше оттолкнуться.
async function findMatchedArtist(tag: string): Promise<any | null> {
  const page = 1 + Math.floor(Math.random() * MAX_LASTFM_PAGE);
  let candidates = await fetchLastfmCandidates(tag, page);
  // Случайная страница может оказаться пустой (у тега банально нет столько
  // размеченных треков) - откатываемся на первую страницу, чтобы не терять
  // жанр целиком из-за неудачного случайного номера страницы.
  if (candidates.length === 0 && page !== 1) {
    candidates = await fetchLastfmCandidates(tag, 1);
  }
  if (candidates.length === 0) return null;

  const shuffled = candidates.sort(() => Math.random() - 0.5).slice(0, MAX_MATCH_ATTEMPTS);
  const resolved = await Promise.all(shuffled.map(findDeezerPreview));
  const match = resolved.find((t) => t?.artist?.id && !isCompilationArtist(t.artist.name));
  return match?.artist || null;
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

    // По точному тегу никого не нашли - пробуем более широкий жанровый тег
    // (то же самое падение к запасному варианту, что и в spotify-mix).
    let usedTag = genre;
    if (!artist) {
      const fallbackTag = getFallbackTag(genre);
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
