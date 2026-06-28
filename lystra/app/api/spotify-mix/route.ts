import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get('genre');

  if (!genre) return NextResponse.json({ error: 'Жанр не указан', tracks: [] }, { status: 400 });

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) return NextResponse.json({ error: 'Ключи не настроены', tracks: [] }, { status: 500 });

  try {
    const accountsBase = ['https://', 'accounts.', 'spotify.', 'com'].join('');
    const apiBase = ['https://', 'api.', 'spotify.', 'com', '/v1'].join('');

    // 1. Получаем токен
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
    const token = authData.access_token;

    // 2. Ищем плейлисты по жанру
    const query = encodeURIComponent(genre);
    const searchRes = await fetch(`${apiBase}/search?q=${query}&type=playlist&limit=20`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const searchData = await searchRes.json();

    // ФИЛЬТР-УБИЙЦА ОШИБКИ 403: Убираем алгоритмические плейлисты от самого Spotify
    const userPlaylists = (searchData.playlists?.items || []).filter(
      (p: any) => p && p.owner && p.owner.id !== 'spotify'
    );

    if (userPlaylists.length === 0) {
      return NextResponse.json({ message: 'Пользовательские плейлисты не найдены', tracks: [] });
    }

    // 3. Достаем треки из первого попавшегося публичного плейлиста
    let rawSpotifyTracks: any[] = [];
    let finalPlaylistName = '';

    for (const playlist of userPlaylists) {
      const tracksRes = await fetch(`${apiBase}/playlists/${playlist.id}/tracks?limit=30`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (tracksRes.ok) {
        const tracksData = await tracksRes.json();
        const validItems = tracksData.items?.filter((item: any) => item.track) || [];
        
        if (validItems.length > 0) {
          rawSpotifyTracks = validItems.sort(() => Math.random() - 0.5).slice(0, 10);
          finalPlaylistName = playlist.name;
          break; // Бинго, треки есть, выходим!
        }
      }
    }

    if (rawSpotifyTracks.length === 0) {
      return NextResponse.json({ message: 'Треки в плейлистах не найдены', tracks: [] });
    }

    // 4. Отправляем названия в iTunes за гарантированными превьюшками
    const finalTracks = [];
    for (const item of rawSpotifyTracks) {
      if (finalTracks.length >= 4) break;

      const artistName = item.track.artists?.[0]?.name || '';
      const trackName = item.track.name;
      const itunesQuery = encodeURIComponent(`${artistName} ${trackName}`);

      try {
        const itunesRes = await fetch(`https://itunes.apple.com/search?term=${itunesQuery}&entity=musicTrack&limit=1`);
        const itunesData = await itunesRes.json();

        if (itunesData.results && itunesData.results.length > 0 && itunesData.results[0].previewUrl) {
          const itunesTrack = itunesData.results[0];
          finalTracks.push({
            id: String(itunesTrack.trackId),
            title: trackName,
            artist: artistName,
            cover: itunesTrack.artworkUrl100?.replace('100x100bb', '300x300bb') || item.track.album?.images?.[0]?.url,
            audio: itunesTrack.previewUrl
          });
        }
      } catch (err) {
        console.error('Ошибка iTunes:', err);
      }
    }

    return NextResponse.json({ playlist: finalPlaylistName, tracks: finalTracks });

  } catch (error: any) {
    return NextResponse.json({ error: 'Внутренняя ошибка сервера', tracks: [] }, { status: 500 });
  }
}