import { NextResponse } from 'next/server';
import { classifyGenreToDeezerId } from '@/lib/deezerGenreClassifier';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get('genre');

  if (!genre) return NextResponse.json({ error: 'Жанр не указан', tracks: [] }, { status: 400 });

  try {
    const deezerGenreId = classifyGenreToDeezerId(genre);

    // Жанр слишком нишевый, чтобы уверенно сопоставить его с реальной категорией
    // Deezer — лучше честно ничего не найти, чем подсунуть трек не в тему.
    if (deezerGenreId === null) {
      return NextResponse.json({ message: 'Треки для этого жанра не найдены', tracks: [] });
    }

    const chartRes = await fetch(`https://api.deezer.com/chart/${deezerGenreId}/tracks?limit=50`);
    const chartData = await chartRes.json();
    const items: any[] = chartData.data || chartData.tracks?.data || [];

    const validItems = items.filter((track: any) => track.preview);
    if (validItems.length === 0) {
      return NextResponse.json({ message: 'Треки с превью не найдены', tracks: [] });
    }

    const rawTracks = validItems.sort(() => Math.random() - 0.5).slice(0, 10);

    const finalTracks = rawTracks.map((track: any) => ({
      id: String(track.id),
      title: track.title,
      artist: track.artist?.name || 'Неизвестный исполнитель',
      cover: track.album?.cover_xl || track.album?.cover_big || track.album?.cover || null,
      audio: track.preview,
    }));

    return NextResponse.json({ playlist: genre, tracks: finalTracks });
  } catch (error: any) {
    console.error('Ошибка Deezer API:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера', tracks: [] }, { status: 500 });
  }
}
