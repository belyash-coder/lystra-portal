import { NextResponse } from 'next/server';
import { Candidate, candidateKey, getFallbackTag, fetchLastfmCandidates, findDeezerPreview } from '@/lib/lastfmGenre';

export const dynamic = 'force-dynamic';

const TARGET_TRACK_COUNT = 10;

function dedupeById(tracks: any[], excludeIds: Set<string> = new Set()): any[] {
  const seen = new Set(excludeIds);
  return tracks.filter((t) => {
    const id = String(t.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
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
