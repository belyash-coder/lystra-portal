import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get('genre');

  if (!genre) return NextResponse.json({ error: 'Жанр не указан', tracks: [] }, { status: 400 });

  try {
    // 1. Ищем плейлисты по жанру напрямую в Deezer
    const query = encodeURIComponent(genre);
    const searchRes = await fetch(`https://api.deezer.com/search/playlist?q=${query}&limit=10`);
    const searchData = await searchRes.json();

    const playlists = searchData.data || [];
    if (playlists.length === 0) {
      return NextResponse.json({ message: 'Плейлисты не найдены', tracks: [] });
    }

    // 2. Ищем рабочий плейлист и вытягиваем треки
    let rawTracks: any[] = [];
    let finalPlaylistName = '';

    for (const playlist of playlists) {
      const tracksRes = await fetch(`https://api.deezer.com/playlist/${playlist.id}/tracks?limit=50`);
      const tracksData = await tracksRes.json();
      
      // Сразу отсеиваем треки без превью (у Deezer они обычно есть)
      const validItems = (tracksData.data || []).filter((track: any) => track.preview);

      if (validItems.length >= 4) {
        // Перемешиваем и берем с запасом
        rawTracks = validItems.sort(() => Math.random() - 0.5).slice(0, 10); 
        finalPlaylistName = playlist.title;
        break; // Нашли годный плейлист — выходим из цикла
      }
    }

    if (rawTracks.length === 0) {
      return NextResponse.json({ message: 'Треки с превью не найдены', tracks: [] });
    }

    // 3. Форматируем результат для фронтенда
    const finalTracks = rawTracks.slice(0, 4).map((track: any) => ({
      id: String(track.id),
      title: track.title,
      artist: track.artist.name,
      cover: track.album.cover_xl || track.album.cover_big || track.album.cover,
      audio: track.preview
    }));

    return NextResponse.json({ playlist: finalPlaylistName, tracks: finalTracks });

  } catch (error: any) {
    console.error('Ошибка Deezer API:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера', tracks: [] }, { status: 500 });
  }
}