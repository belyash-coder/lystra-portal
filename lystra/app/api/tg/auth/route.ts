import { NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { getAuthSecret } from '@/lib/authSecret';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

// Проверка подлинности initData по алгоритму Telegram:
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
function verifyInitData(initData: string, botToken: string): TelegramUser | null {
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

    const userRaw = params.get('user');
    if (!userRaw) return null;

    return JSON.parse(userRaw) as TelegramUser;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    if (!BOT_TOKEN) {
      console.error('TELEGRAM_BOT_TOKEN не задан');
      return NextResponse.json({ message: 'Сервер не настроен' }, { status: 500 });
    }

    const { initData } = await request.json();
    if (!initData) {
      return NextResponse.json({ message: 'initData обязателен' }, { status: 400 });
    }

    const tgUser = verifyInitData(initData, BOT_TOKEN);
    if (!tgUser) {
      return NextResponse.json({ message: 'Недействительные данные Telegram' }, { status: 401 });
    }

    const telegramId = BigInt(tgUser.id);

    let profile = await prisma.profiles.findUnique({ where: { telegram_id: telegramId } });

    if (!profile) {
      const baseUsername = tgUser.username || `tg_${tgUser.id}`;
      let username = baseUsername;
      let suffix = 0;
      // На случай редкой коллизии с уже существующим username из веб-портала
      while (await prisma.profiles.findUnique({ where: { username } })) {
        suffix += 1;
        username = `${baseUsername}_${suffix}`;
      }

      profile = await prisma.profiles.create({
        data: {
          telegram_id: telegramId,
          username,
          first_name: tgUser.first_name || null,
          avatar_url: tgUser.photo_url || null,
        },
      });
    } else {
      // Синхронизируем имя и аватар с текущими данными Telegram при каждом входе
      // (пользователь мог сменить имя или фото профиля).
      profile = await prisma.profiles.update({
        where: { id: profile.id },
        data: {
          first_name: tgUser.first_name || profile.first_name,
          avatar_url: tgUser.photo_url || profile.avatar_url,
        },
      });
    }

    const token = jwt.sign({ id: profile.id, telegram_id: tgUser.id }, getAuthSecret(), { expiresIn: '30d' });

    return NextResponse.json({
      token,
      profile: {
        id: profile.id,
        username: profile.username,
        first_name: profile.first_name,
        avatar_url: profile.avatar_url,
      },
    });
  } catch (error) {
    console.error('Telegram auth error:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
