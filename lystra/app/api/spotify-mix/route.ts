import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get('genre');

  if (!genre) {
    return NextResponse.json(
      { error: 'Жанр не указан' },
      { status: 400 }
    );
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('❌ Не найдены SPOTIFY_CLIENT_ID или SPOTIFY_CLIENT_SECRET');

    return NextResponse.json(
      { error: 'Ключи Spotify не настроены' },
      { status: 500 }
    );
  }

  try {
    // ==========================
    // Получаем Access Token
    // ==========================

    const credentials = Buffer.from(
      `${clientId}:${clientSecret}`
    ).toString('base64');

    const authRes = await fetch(
      'https://accounts.spotify.com/api/token',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      }
    );

    const authData = await authRes.json();

    console.log('Spotify Auth Status:', authRes.status);
    console.log('Spotify Auth Response:', authData);

    if (!authRes.ok || !authData.access_token) {
      return NextResponse.json(
        {
          error: 'Не удалось получить токен Spotify',
          spotify: authData,
          tracks: []
        },
        { status: 500 }
      );
    }

    const token = authData.access_token;

    // ==========================
    // Поиск плейлиста
    // ==========================

    const query = encodeURIComponent(`${genre} mix`);

    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${query}&type=playlist&limit=5`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const searchData = await searchRes.json();

    console.log('Spotify Search Status:', searchRes.status);
    console.log('Spotify Search Response:', searchData);

    if (!searchRes.ok) {
      return NextResponse.json(
        {
          error: 'Ошибка поиска Spotify',
          spotify: searchData,
          tracks: []
        },
        { status: 500 }
      );
    }

    const playlist = searchData.playlists?.items?.[0];

    if (!playlist) {
      console.log('Плейлист не найден');

      return NextResponse.json({
        tracks: [],
        message: 'Плейлист не найден'
      });
    }

    // ==========================
    // Получаем треки
    // ==========================

    const tracksRes = await fetch(
      `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const tracksData = await tracksRes.json();

    console.log('Spotify Tracks Status:', tracksRes.status);
    console.log(
      `Получено треков: ${tracksData.items?.length ?? 0}`
    );

    if (!tracksRes.ok) {
      return NextResponse.json(
        {
          error: 'Ошибка получения треков',
          spotify: tracksData,
          tracks: []
        },
        { status: 500 }
      );
    }

    const validTracks =
      tracksData.items
        ?.filter((item: any) => item.track)
        .filter((item: any) => item.track.preview_url)
        .sort(() => Math.random() - 0.5)
        .slice(0, 4)
        .map((item: any) => ({
          id: item.track.id,
          title: item.track.name,
          artist: item.track.artists
            .map((a: any) => a.name)
            .join(', '),
          cover: item.track.album.images?.[0]?.url ?? null,
          audio: item.track.preview_url
        })) ?? [];

    console.log(
      `Треков с preview_url: ${validTracks.length}`
    );

    return NextResponse.json({
      playlist: playlist.name,
      tracks: validTracks
    });

  } catch (error: any) {
    console.error('Spotify API Error:', error);

    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера',
        details: error.message,
        tracks: []
      },
      { status: 500 }
    );
  }
}