import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.AUTH_SECRET;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export const SESSION_COOKIE = 'cinema_session';

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface SessionPayload {
  profileId: string;
  telegramId: number;
}

// Проверка подлинности initData по алгоритму Telegram:
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
export function verifyTelegramInitData(initData: string, botToken: string): TelegramUser | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const computedHashBuffer = Buffer.from(computedHash, 'hex');
    const receivedHashBuffer = Buffer.from(hash, 'hex');
    if (computedHashBuffer.length !== receivedHashBuffer.length) return null;
    if (!crypto.timingSafeEqual(computedHashBuffer, receivedHashBuffer)) return null;

    const authDate = Number(params.get('auth_date'));
    if (!authDate || Date.now() / 1000 - authDate > 86400) return null;

    const userRaw = params.get('user');
    if (!userRaw) return null;

    return JSON.parse(userRaw) as TelegramUser;
  } catch {
    return null;
  }
}

export function getBotToken(): string {
  if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN не задан');
  return BOT_TOKEN;
}

function getJwtSecret(): string {
  if (!JWT_SECRET) throw new Error('AUTH_SECRET не задан');
  return JWT_SECRET;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '30d' });
}

function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentProfile() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = verifySession(token);
  if (!payload) return null;

  return prisma.profile.findUnique({ where: { id: payload.profileId } });
}
