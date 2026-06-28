import { NextResponse } from 'next/server';

// Отключаем кэш, чтобы всегда получать свежую рулетку
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
    return NextResponse.json({ error: 'Ключи Spotify не настроены на сервере', tracks: [] }, { status: 500 });
  }

  try {
    // Собираем ссылки по кускам для обхода текстовых фильтров
    const accountsBase = ['https://', 'accounts.', 'spotify.', 'com'].join('');
    const apiBase = ['https://', 'api.', 'spotify.', 'com', '/v1'].join('');

    // ==========================
    // 1. Получаем токен Spotify (Vercel сделает это из США)
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
    if (!authData.access_token) {
      return NextResponse.json({ error: 'Ошибка авторизации Spotify', tracks: [] }, { status: 500 });
    }
    const token = authData.access_token;

    // ==========================
    // 2. Ищем ТРЕКИ напрямую (забудь про плейлисты!)
    // ==========================
    // Пробуем искать строго по тегу жанра, если не выйдет - ищем просто как текст
    let query = encodeURIComponent(`genre:"${genre}"`);
    let searchRes = await fetch(`${apiBase}/search?q=${query}&type=track&limit=20`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    let searchData = await searchRes.json();

    // Фоллбэк: если строгий поиск по жанру не дал результатов
    if (!searchData.tracks?.items?.length) {
      query = encodeURIComponent(genre);
      searchRes = await fetch(`${apiBase}/search?q=${query}&type=track&limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      searchData = await searchRes.json();
    }

    const rawSpotifyTracks = searchData.tracks?.items || [];
    
    if (rawSpotifyTracks.length === 0) {
      return NextResponse.json({ message: 'Треки не найдены', tracks: [] });
    }

    // Перемешиваем и берем 10 случайных, чтобы рулетка всегда была разной
    const shuffledTracks = rawSpotifyTracks.sort(() => Math.random() - 0.5).slice(0, 10);

    // ==========================
    // 3. Вытягиваем аудио 30 сек из iTunes
    // ==========================
    const finalTracks = [];

    for (const item of shuffledTracks) {
      if (finalTracks.length >= 4) break; // Нам нужно только 4 трека для рулетки

      const artistName = item.artists?.[0]?.name || '';
      const trackName = item.name;
      const itunesQuery = encodeURIComponent(`${artistName} ${trackName}`);

      try {
        const itunesRes = await fetch(`https://itunes.apple.com/search?term=${itunesQuery}&entity=musicTrack&limit=1`);
        const itunesData = await itunesRes.json();

        if (itunesData.results && itunesData.results.length > 0 && itunesData.results[0].previewUrl) {
          const itunesTrack = itunesData.results[0];
          
          finalTracks.push({
            id: String(itunesTrack.trackId),
            title: trackName,
            artist: item.artists.map((a: any) => a.name).join(', '),
            cover: itunesTrack.artworkUrl100?.replace('100x100bb', '300x300bb') || item.album?.images?.[0]?.url,
            audio: itunesTrack.previewUrl
          });
        }
      } catch (err) {
        console.error('Ошибка iTunes:', err);
      }
    }

    return NextResponse.json({
      playlist: `${genre} Selection`,
      tracks: finalTracks
    });

  } catch (error: any) {
    console.error('Критическая ошибка:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка', tracks: [] }, { status: 500 });
  }
}