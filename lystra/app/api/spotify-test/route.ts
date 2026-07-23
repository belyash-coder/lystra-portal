import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Тестовый эндпоинт - просто дёргает Spotify Web API напрямую и отдаёт сырой
// ответ, чтобы вживую посмотреть, что реально возвращает Spotify (в первую
// очередь - есть ли preview_url, раз Spotify в конце 2024 ограничил его для
// части приложений без "extended quota mode") и как ведёт себя с нашего IP.
// Ничего не мапим и не встраиваем в приложение - только для ручной проверки.

// Не доверяем res.json() напрямую - если Spotify отвечает не-2xx статусом с
// пустым или не-JSON телом (например 404/403 без тела, или HTML-страница
// ошибки), res.json() падает с невыразительным "Unexpected end of JSON
// input" вместо того, чтобы показать реальный статус/содержимое.
async function safeReadJson(res: Response): Promise<{ parsed: any; raw: string }> {
  const raw = await res.text();
  try {
    return { parsed: raw ? JSON.parse(raw) : null, raw };
  } catch {
    return { parsed: null, raw };
  }
}

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
  const { parsed, raw } = await safeReadJson(res);
  if (!res.ok) {
    // Длину id/secret отдаём вместо самих значений - чтобы поймать частую
    // причину (случайно вставленный лишний пробел/перенос строки), не
    // засвечивая сам секрет в ответе.
    throw new Error(
      `Spotify token ответил ${res.status}: ${raw} (clientId length=${clientId.length}, clientSecret length=${clientSecret.length})`
    );
  }
  const data = parsed;
  // Токен client-credentials живёт час - кэшируем, чтобы не ходить за ним
  // на каждый тестовый запрос.
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.token;
}

// Считаем, у скольких треков реально есть preview_url - это то единственное,
// от чего зависит, есть ли смысл вообще идти этим путём (без превью цепочка
// плейлист->треки бесполезна для рулетки, ровно как и умерший
// Recommendations).
function summarizeTracks(tracks: any[]): { total: number; withPreview: number; sample: any[] } {
  const withPreview = tracks.filter((t) => !!t?.preview_url).length;
  return {
    total: tracks.length,
    withPreview,
    sample: tracks.slice(0, 10).map((t) => ({
      title: t?.name,
      artist: t?.artists?.map((a: any) => a.name).join(', '),
      preview_url: t?.preview_url ?? null,
    })),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // mode=search (по умолчанию) - обычный текстовый поиск треков.
  // mode=recommendations - жанр+рынок (эндпоинт задеприкейчен для новых
  // приложений, см. предыдущие живые тесты - оставлен для справки).
  // mode=playlist-search - ищем плейлисты по жанровому слову (обычный
  // поиск, не Browse API - тот тоже задеприкейчен).
  // mode=playlist-tracks - треки конкретного плейлиста (?playlist=<id>),
  // с подсчётом, у скольких реально есть preview_url.
  const mode = searchParams.get('mode') || 'search';

  try {
    const token = await getSpotifyToken();

    if (mode === 'playlist-search') {
      const params = new URLSearchParams({
        q: searchParams.get('genre') || 'rock',
        type: 'playlist',
        limit: searchParams.get('limit') || '10',
      });
      const url = `https://api.spotify.com/v1/search?${params.toString()}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const { parsed, raw } = await safeReadJson(res);
      // У поиска плейлистов известный баг Spotify - часть элементов в items
      // приходит как null (недоступные/приватные плейлисты), а не просто
      // отфильтрована - выкидываем их сами.
      const playlists = (parsed?.playlists?.items || []).filter(Boolean).map((p: any) => ({
        id: p.id,
        name: p.name,
        owner: p.owner?.display_name,
        tracksTotal: p.tracks?.total,
      }));
      return NextResponse.json(
        { requestedUrl: url, status: res.status, playlists, raw: parsed ? undefined : raw },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (mode === 'playlist-tracks') {
      const playlistId = searchParams.get('playlist');
      if (!playlistId) throw new Error('Нужен параметр ?playlist=<id> (взять из mode=playlist-search)');
      const params = new URLSearchParams({ limit: searchParams.get('limit') || '50', fields: 'items(track(name,artists,preview_url))' });
      const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?${params.toString()}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const { parsed, raw } = await safeReadJson(res);
      const tracks = (parsed?.items || []).map((i: any) => i.track).filter(Boolean);
      return NextResponse.json(
        { requestedUrl: url, status: res.status, summary: summarizeTracks(tracks), raw: parsed ? undefined : raw },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

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
    const { parsed, raw } = await safeReadJson(res);
    const data = parsed ?? raw;
    const tracks: any[] = mode === 'search' ? data?.tracks?.items || [] : [];
    return NextResponse.json(
      { requestedUrl: url, status: res.status, data, summary: mode === 'search' ? summarizeTracks(tracks) : undefined },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
