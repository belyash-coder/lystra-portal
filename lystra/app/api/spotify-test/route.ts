import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Тестовый эндпоинт - просто дёргает Spotify Web API напрямую и отдаёт сырой
// ответ, чтобы вживую посмотреть, что реально возвращает Spotify (в первую
// очередь - есть ли preview_url, раз Spotify в конце 2024 ограничил его для
// части приложений без "extended quota mode") и как ведёт себя с нашего IP.
// Ничего не мапим и не встраиваем в приложение - только для ручной проверки.

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getSpotifyToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  // .trim() - частая причина 400 у только что вставленных в Coolify секретов:
  // копипаст из терминала/файла нередко тащит за собой завершающий перевод
  // строки, и он попадает прямо в Authorization-заголовок.
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error('SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET не настроены');

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    // Длину id/secret отдаём вместо самих значений - чтобы поймать частую
    // причину (случайно вставленный лишний пробел/перенос строки), не
    // засвечивая сам секрет в ответе.
    throw new Error(
      `Spotify token ответил ${res.status}: ${bodyText} (clientId length=${clientId.length}, clientSecret length=${clientSecret.length})`
    );
  }
  const data = await res.json();
  // Токен client-credentials живёт час - кэшируем, чтобы не ходить за ним
  // на каждый тестовый запрос.
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.token;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // mode=search (по умолчанию) - обычный текстовый поиск треков.
  // mode=recommendations - то, что ближе всего к нашей "рулетке": жанр +
  // рынок (market, ISO-код страны) + лимит.
  const mode = searchParams.get('mode') || 'search';

  try {
    const token = await getSpotifyToken();

    let url: string;
    if (mode === 'recommendations') {
      const params = new URLSearchParams({
        seed_genres: searchParams.get('genre') || 'rock',
        limit: searchParams.get('limit') || '5',
      });
      const market = searchParams.get('market');
      if (market) params.set('market', market);
      url = `https://api.spotify.com/v1/recommendations?${params.toString()}`;
    } else {
      const params = new URLSearchParams({
        q: searchParams.get('q') || 'artist:Radiohead',
        type: 'track',
        limit: searchParams.get('limit') || '5',
      });
      url = `https://api.spotify.com/v1/search?${params.toString()}`;
    }

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    return NextResponse.json({ requestedUrl: url, status: res.status, data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
