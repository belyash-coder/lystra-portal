import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const TARGET_TRACK_COUNT = 10;

interface Candidate {
  name: string;
  artist: string;
}

function candidateKey(c: Candidate): string {
  return `${c.artist.toLowerCase()}||${c.name.toLowerCase()}`;
}

function dedupeById(tracks: any[], excludeIds: Set<string> = new Set()): any[] {
  const seen = new Set(excludeIds);
  return tracks.filter((t) => {
    const id = String(t.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

// Список жанров рулетки — это ~6300 нишевых микро-жанров (в духе Every Noise at
// Once). Многие из них — гипер-конкретные составные фразы ("Irish Post-Punk",
// "Sad Sierreno"), которых как единого тега на Last.fm часто просто не
// существует, хотя главное слово в них ("post-punk", "sierreno") — вполне
// ходовой тег. Используем его как более широкий, но всё ещё жанрово точный
// запасной вариант, когда по точной фразе треков мало или нет вообще.
function getFallbackTag(genre: string): string | null {
  const words = genre.trim().split(/\s+/);
  if (words.length <= 1) return null;
  return words[words.length - 1];
}

// У Deezer нет тегов для таких нишевых жанров, зато у Last.fm есть теги от
// самих пользователей (folksonomy) — они гораздо точнее совпадают именно с
// такими ярлыками. Last.fm не отдаёт превью для проигрывания, поэтому находим
// трек там (точный жанр), а само превью ищем по названию+артисту в Deezer.
async function fetchLastfmCandidates(tag: string): Promise<Candidate[]> {
  if (!LASTFM_API_KEY) return [];
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=tag.gettoptracks&tag=${encodeURIComponent(tag)}&api_key=${LASTFM_API_KEY}&format=json&limit=50`;
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
    // Обычный текстовый поиск вместо строгого artist:"" track:"" — у Deezer и
    // Last.fm написание артиста/трека может немного отличаться (feat., ремастеры
    // и т.п.), из-за чего точное совпадение часто не находилось вообще.
    const q = `${candidate.artist} ${candidate.name}`;
    const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1`);
    if (!res.ok) return null;
    const data = await res.json();
    const track = data?.data?.[0];
    return track?.preview ? track : null;
  } catch {
    return null;
  }
}

async function resolveTracks(candidates: Candidate[], limit: number): Promise<any[]> {
  if (candidates.length === 0 || limit <= 0) return [];
  const shuffled = candidates.sort(() => Math.random() - 0.5).slice(0, 30);
  const resolved = await Promise.all(shuffled.map(findDeezerPreview));
  return resolved.filter((t): t is any => t !== null).slice(0, limit);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get('genre');

  if (!genre) return NextResponse.json({ error: 'Жанр не указан', tracks: [] }, { status: 400 });

  try {
    const triedKeys = new Set<string>();

    const exactCandidates = await fetchLastfmCandidates(genre);
    exactCandidates.forEach((c) => triedKeys.add(candidateKey(c)));

    const exactTracks = dedupeById(await resolveTracks(exactCandidates, TARGET_TRACK_COUNT));
    const exactIds = new Set(exactTracks.map((t) => String(t.id)));

    // По точной фразе жанра нашлось мало треков (или вообще ничего) — добираем
    // до нужного количества по более широкому, но всё ещё жанрово точному тегу
    // (главное слово фразы), не теряя уже найденное по точному жанру. Честно
    // сообщаем клиенту, сколько треков откуда, чтобы он мог показать это
    // пользователю, а не выдавать добор за точное совпадение.
    let fallbackTracks: any[] = [];
    let fallbackTag: string | null = null;

    if (exactTracks.length < TARGET_TRACK_COUNT) {
      fallbackTag = getFallbackTag(genre);
      if (fallbackTag) {
        const fallbackCandidates = (await fetchLastfmCandidates(fallbackTag)).filter(
          (c) => !triedKeys.has(candidateKey(c))
        );
        const extra = await resolveTracks(fallbackCandidates, TARGET_TRACK_COUNT - exactTracks.length);
        fallbackTracks = dedupeById(extra, exactIds);
      }
    }

    const allTracks = exactTracks.concat(fallbackTracks);

    if (allTracks.length === 0) {
      return NextResponse.json({ message: 'Треки для этого жанра не найдены', tracks: [] });
    }

    const finalTracks = allTracks.map((track: any) => ({
      id: String(track.id),
      title: track.title,
      artist: track.artist?.name || 'Неизвестный исполнитель',
      cover: track.album?.cover_xl || track.album?.cover_big || track.album?.cover || null,
      audio: track.preview,
    }));

    return NextResponse.json({
      playlist: genre,
      tracks: finalTracks,
      exactCount: exactTracks.length,
      fallbackTag: fallbackTracks.length > 0 ? fallbackTag : null,
    });
  } catch (error: any) {
    console.error('Ошибка при подборе треков:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера', tracks: [] }, { status: 500 });
  }
}
