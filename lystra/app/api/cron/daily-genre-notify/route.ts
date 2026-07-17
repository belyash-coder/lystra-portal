import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getGenreForDate } from '@/lib/dailyGenre';
import { buildGenreDeepLink } from '@/lib/telegramDeepLink';

export const dynamic = 'force-dynamic';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;

// Максимум ~30 сообщений/сек по лимитам Bot API — шлём пачками с паузой,
// с большим запасом по безопасности.
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendTelegramMessage(chatId: bigint, text: string, deepLink: string | null): Promise<'ok' | 'blocked' | 'error'> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId.toString(),
        text,
        reply_markup: deepLink
          ? { inline_keyboard: [[{ text: 'Слушать', url: deepLink }]] }
          : undefined,
      }),
    });
    if (res.ok) return 'ok';
    const data = await res.json().catch(() => null);
    // 403 = пользователь заблокировал бота — дальше слать смысла нет,
    // сами выключаем ему уведомления, чтобы не пытаться снова каждый день.
    if (res.status === 403 || data?.error_code === 403) return 'blocked';
    return 'error';
  } catch {
    return 'error';
  }
}

export async function GET(request: Request) {
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET не настроен' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN не настроен' }, { status: 500 });
  }

  const genre = getGenreForDate(new Date());
  const deepLink = buildGenreDeepLink(genre);
  const text = `🎲 Жанр дня: ${genre}\n\nЗаходи в LYSTRA и слушай подборку!`;

  const recipients = await prisma.profiles.findMany({
    where: { telegram_id: { not: null }, notify_daily_genre: true },
    select: { id: true, telegram_id: true },
  });

  let sent = 0;
  let blocked = 0;
  let failed = 0;
  const blockedIds: string[] = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((r) => sendTelegramMessage(r.telegram_id as bigint, text, deepLink))
    );
    results.forEach((result, idx) => {
      if (result === 'ok') sent += 1;
      else if (result === 'blocked') {
        blocked += 1;
        blockedIds.push(batch[idx].id);
      } else failed += 1;
    });
    if (i + BATCH_SIZE < recipients.length) await sleep(BATCH_DELAY_MS);
  }

  if (blockedIds.length > 0) {
    await prisma.profiles.updateMany({
      where: { id: { in: blockedIds } },
      data: { notify_daily_genre: false },
    });
  }

  return NextResponse.json({ genre, total: recipients.length, sent, blocked, failed });
}
