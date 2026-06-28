import { NextResponse } from 'next/server';

// Жестко отключаем кэш роута
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get('genre');

  if (!genre) {
    return NextResponse.json({ error: 'Жанр не указан', tracks: [] }, { status: 400 });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('❌ Не найдены ключи Spotify в переменных окружения');
    return NextResponse.json({ error: 'Ключи Spotify не настроены', tracks: [] }, { status: 500 });
  }

  try {
    // Собираем ссылки по частям, чтобы обойти любые искажения текста
    const accountsBase = ['https://', 'accounts.', 'spotify.', 'com'].join('');
    const apiBase = ['https://', 'api.', 'spotify.', 'com', '/v1'].join('');

    // ==========================
    // 1. Получаем Access Token
    // ==========================
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const authRes = await fetch(`${accountsBase}/api/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    const authData = await authRes.json();

    if (!authRes.ok || !authData.access_token) {
      console.error('❌ Ошибка авторизации Spotify:', authData);
      return NextResponse.json({ error: 'Не удалось получить токен Spotify', tracks: [] }, { status: 500 });
    }

    const token = authData.access_token;

    // ==========================
    // 2. Поиск плейлистов
    // ==========================
    const query = encodeURIComponent(genre);
    const searchRes = await fetch(`${apiBase}/search?q=${query}&type=playlist&limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const searchData = await searchRes.json();
    const playlists = searchData.playlists?.items || [];

    if (playlists.length === 0) {
      return NextResponse.json({ message: 'Плейлисты не найдены', tracks: [] });
    }

// ==========================
    // 3. Умный поиск треков (обход 403 и отсутствия превью)
    // ==========================
    let finalPlaylistName = '';
    let finalTracks: any[] = [];

    for (const playlist of playlists) {
      if (!playlist) continue;

      const tracksRes = await fetch(`${apiBase}/playlists/${playlist.id}/tracks?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (tracksRes.ok) {
        const tempTracksData = await tracksRes.json();
        
        // Сразу внутри цикла проверяем, есть ли в этом плейлисте треки С ПРЕВЬЮ
        const tracksWithAudio = tempTracksData.items?.filter(
          (item: any) => item.track && item.track.preview_url
        ) || [];

        if (tracksWithAudio.length > 0) {
          // Бинго! Плейлист открыт И в нем есть треки с аудио
          finalPlaylistName = playlist.name;
          
          // Форматируем, перемешиваем и забираем 4 штуки
          finalTracks = tracksWithAudio
            .sort(() => Math.random() - 0.5)
            .slice(0, 4)
            .map((item: any) => ({
              id: String(item.track.id),
              title: item.track.name,
              artist: item.track.artists.map((a: any) => a.name).join(', '),
              cover: item.track.album.images?.[0]?.url ?? null,
              audio: item.track.preview_url
            }));
            
          break; // Выходим из цикла, мы нашли то, что нужно
        } else {
          console.log(`⚠️ В плейлисте "${playlist.name}" нет треков с превью. Ищем дальше...`);
        }
      }
    }

    if (finalTracks.length === 0) {
      console.error('❌ Ни в одном из 5 плейлистов не нашлось треков с доступным аудио-превью.');
      return NextResponse.json({ message: 'Нет треков с аудио', tracks: [] });
    }

    // ==========================
    // 4. Выдача результата
    // ==========================
    return NextResponse.json({
      playlist: finalPlaylistName,
      tracks: finalTracks
    });

  } catch (error: any) {
    console.error('❌ Критическая ошибка API Spotify:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера', tracks: [] }, { status: 500 });
  }
}