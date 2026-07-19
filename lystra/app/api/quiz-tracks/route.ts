import { NextResponse } from 'next/server';
import { dedupeById, fetchLastfmCandidates, resolveTracks, type DeezerTrack } from '@/lib/deezerPreview';
import { findQuizGenre } from '@/data/quizGenres';

export const dynamic = 'force-dynamic';

const TARGET_TRACK_COUNT = 8;

// Для викторины варианты ответа должны быть разными исполнителями — если
// у одного артиста в подборке несколько треков, оставляем только первый,
// иначе среди вариантов ответа окажутся дубликаты.
function dedupeByArtist(tracks: DeezerTrack[]): DeezerTrack[] {
  const seen = new Set<string>();
  return tracks.filter((t) => {
    const artist = (t.artist?.name || '').toLowerCase().trim();
    if (!artist || seen.has(artist)) return false;
    seen.add(artist);
    return true;
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get('section') || '';
  const genre = searchParams.get('genre') || '';

  const found = findQuizGenre(section, genre);
  if (!found) {
    return NextResponse.json({ error: 'Раздел или жанр не найден', tracks: [] }, { status: 400 });
  }

  try {
    const candidates = await fetchLastfmCandidates(found.genre.tag);
    const tracks = dedupeByArtist(dedupeById(await resolveTracks(candidates, TARGET_TRACK_COUNT * 3))).slice(
      0,
      TARGET_TRACK_COUNT
    );

    if (tracks.length === 0) {
      return NextResponse.json({ message: 'Треки для этого жанра не найдены', tracks: [] });
    }

    const finalTracks = tracks.map((track) => ({
      id: String(track.id),
      title: track.title,
      artist: track.artist?.name || 'Неизвестный исполнитель',
      cover: track.album?.cover_xl || track.album?.cover_big || track.album?.cover || null,
      audio: track.preview,
    }));

    return NextResponse.json({ section: found.section.id, genre: found.genre.id, tracks: finalTracks });
  } catch (error) {
    console.error('Ошибка при подборе треков для квиза:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера', tracks: [] }, { status: 500 });
  }
}
