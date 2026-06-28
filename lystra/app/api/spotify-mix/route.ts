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
    // 3. Умный поиск треков (База Spotify)
    // ==========================
    let rawSpotifyTracks: any[] = [];
    let finalPlaylistName = '';

    for (const playlist of playlists) {
      if (!playlist) continue;

      const tracksRes = await fetch(`${apiBase}/playlists/${playlist.id}/tracks?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (tracksRes.ok) {
        const tempTracksData = await tracksRes.json();
        // Забираем вообще любые треки (даже без превью), нам нужны только их названия!
        const validItems = tempTracksData.items?.filter((item: any) => item.track) || [];
        
        if (validItems.length > 0) {
          // Берем 15 случайных треков с запасом, чтобы было из чего выбирать
          rawSpotifyTracks = validItems.sort(() => Math.random() - 0.5).slice(0, 15);
          finalPlaylistName = playlist.name;
          break; 
        }
      }
    }

    if (rawSpotifyTracks.length === 0) {
      return NextResponse.json({ message: 'Нет доступных треков в Spotify', tracks: [] });
    }

    // ==========================
    // 4. Добываем аудио-превью через iTunes API
    // ==========================
    const finalTracks = [];

    for (const item of rawSpotifyTracks) {
      if (finalTracks.length >= 4) break; // Собрали 4 штуки — останавливаем цикл

      const artistName = item.track.artists[0]?.name || '';
      const trackName = item.track.name;
      // Собираем точный запрос: "Артист Название"
      const itunesQuery = encodeURIComponent(`${artistName} ${trackName}`);

      try {
        const itunesRes = await fetch(`https://itunes.apple.com/search?term=${itunesQuery}&entity=musicTrack&limit=1`);
        const itunesData = await itunesRes.json();

        // Если iTunes нашел песню и у нее есть превью — берем!
        if (itunesData.results && itunesData.results.length > 0 && itunesData.results[0].previewUrl) {
          const itunesTrack = itunesData.results[0];
          
          finalTracks.push({
            id: String(itunesTrack.trackId),
            title: item.track.name, // Название оставляем как в Spotify
            artist: item.track.artists.map((a: any) => a.name).join(', '),
            // Берем картинку из iTunes, но если ее нет — фоллбэк на Spotify
            cover: itunesTrack.artworkUrl100?.replace('100x100bb', '300x300bb') || item.track.album.images?.[0]?.url,
            audio: itunesTrack.previewUrl // То самое гарантированное аудио!
          });
        }
      } catch (err) {
        console.error('Ошибка при запросе к iTunes:', err);
      }
    }

    // ==========================
    // 5. Выдача результата
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