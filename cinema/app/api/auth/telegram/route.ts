import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBotToken, verifyTelegramInitData, signSession, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { initData } = await request.json();
    if (!initData) {
      return NextResponse.json({ message: 'initData обязателен' }, { status: 400 });
    }

    const tgUser = verifyTelegramInitData(initData, getBotToken());
    if (!tgUser) {
      return NextResponse.json({ message: 'Недействительные данные Telegram' }, { status: 401 });
    }

    const telegramId = BigInt(tgUser.id);

    const profile = await prisma.profile.upsert({
      where: { telegramId },
      create: {
        telegramId,
        username: tgUser.username || null,
        firstName: tgUser.first_name || null,
        lastName: tgUser.last_name || null,
        avatarUrl: tgUser.photo_url || null,
      },
      update: {
        username: tgUser.username || null,
        firstName: tgUser.first_name || null,
        lastName: tgUser.last_name || null,
        avatarUrl: tgUser.photo_url || null,
      },
    });

    const token = signSession({ profileId: profile.id, telegramId: tgUser.id });

    const response = NextResponse.json({
      profile: {
        id: profile.id,
        username: profile.username,
        firstName: profile.firstName,
        avatarUrl: profile.avatarUrl,
      },
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error('Telegram auth error:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
