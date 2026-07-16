import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;

interface Candidate {
  name: string;
  artist: string;
}

// Список жанров рулетки — это ~6300 нишевых микро-жанров (в духе Every Noise at
// Once). У Deezer нет для них тегов, зато у Last.fm есть теги от самих
// пользователей (folksonomy) — они гораздо точнее совпадают именно с такими
// ярлыками. Last.fm не отдаёт превью для проигрывания, поэтому находим трек там
// (точный жанр), а само превью для проигрывания ищем по названию+артисту в Deezer.
async function fetchLastfmCandidates(genre: string): Promise<Candidate[]> {
  if (!LASTFM_API_KEY) return [];
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=tag.gettoptracks&tag=${encodeURIComponent(genre)}&api_key=${LASTFM_API_KEY}&format=json&limit=30`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    let items = data?.tracks?.track;
    if (!items) return [];
    if (!Array.isArray(items)) items = [items]; // Last.fm отдаёт объект вместо массива при единственном результате

    return items
      .map((t: any) => ({ name: t?.name, artist: t?.artist?.name }))
      .filter((t: Candidate) => !!t.name && !!t.artist);
  } catch {
    return [];
  }
}

async function findDeezerPreview(candidate: Candidate): Promise<any | null> {
  try {
    const q = `artist:"${candidate.artist}" track:"${candidate.name}"`;
    const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1`);
    if (!res.ok) return null;
    const data = await res.json();
    const track = data?.data?.[0];
    return track?.preview ? track : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get('genre');

  if (!genre) return NextResponse.json({ error: 'Жанр не указан', tracks: [] }, { status: 400 });

  try {
    const candidates = await fetchLastfmCandidates(genre);
    if (candidates.length === 0) {
      return NextResponse.json({ message: 'Треки для этого жанра не найдены', tracks: [] });
    }

    // Перемешиваем (чтобы при повторных прокрутках одного жанра выпадали разные
    // треки) и берём запас кандидатов — не у всех найдётся играбельное превью.
    const shuffled = candidates.sort(() => Math.random() - 0.5).slice(0, 20);
    const resolved = await Promise.all(shuffled.map(findDeezerPreview));
    const validTracks = resolved.filter((t): t is any => t !== null).slice(0, 10);

    if (validTracks.length === 0) {
      return NextResponse.json({ message: 'Треки с превью не найдены', tracks: [] });
    }

    const finalTracks = validTracks.map((track: any) => ({
      id: String(track.id),
      title: track.title,
      artist: track.artist?.name || 'Неизвестный исполнитель',
      cover: track.album?.cover_xl || track.album?.cover_big || track.album?.cover || null,
      audio: track.preview,
    }));

    return NextResponse.json({ playlist: genre, tracks: finalTracks });
  } catch (error: any) {
    console.error('Ошибка при подборе треков:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера', tracks: [] }, { status: 500 });
  }
}
