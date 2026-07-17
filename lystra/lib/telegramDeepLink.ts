// Тот же base64url-алгоритм, что и в TMA (tma/src/lib/telegram.ts toBase64Url) —
// startapp принимает только [A-Za-z0-9_-], поэтому обычный текст жанра кодируем.
function toBase64Url(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function buildGenreDeepLink(genre: string): string | null {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  if (!botUsername) return null;
  const appShortName = process.env.TELEGRAM_APP_SHORT_NAME || 'app';
  return `https://t.me/${botUsername}/${appShortName}?startapp=genre_${toBase64Url(genre)}`;
}
