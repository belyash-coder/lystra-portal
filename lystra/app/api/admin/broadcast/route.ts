import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BROADCAST_SECRET = process.env.BROADCAST_SECRET;

// Максимум ~30 сообщений/сек по лимитам Bot API — шлём пачками с паузой,
// как и в /api/cron/daily-genre-notify.
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 1000;

// Telegram sendMediaGroup принимает от 2 до 10 элементов за раз.
const MAX_MEDIA_ITEMS = 10;

type SendResult = 'ok' | 'blocked' | 'error';
type MediaType = 'photo' | 'video';
interface MediaItem {
  base64: string;
  ext?: string;
  type: MediaType;
}
interface UploadedMedia {
  type: MediaType;
  fileId: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBlocked(status: number, data: any): boolean {
  return status === 403 || data?.error_code === 403;
}

async function sendTelegramText(chatId: bigint, text: string): Promise<SendResult> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId.toString(), text, parse_mode: 'HTML' }),
    });
    if (res.ok) return 'ok';
    const data = await res.json().catch(() => null);
    return isBlocked(res.status, data) ? 'blocked' : 'error';
  } catch {
    return 'error';
  }
}

async function sendMediaByFileId(chatId: bigint, mediaType: MediaType, fileId: string, caption: string): Promise<SendResult> {
  try {
    const method = mediaType === 'photo' ? 'sendPhoto' : 'sendVideo';
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId.toString(), [mediaType]: fileId, caption, parse_mode: 'HTML' }),
    });
    if (res.ok) return 'ok';
    const data = await res.json().catch(() => null);
    return isBlocked(res.status, data) ? 'blocked' : 'error';
  } catch {
    return 'error';
  }
}

// Первая отправка медиа идёт с реальными байтами файла (multipart) — Telegram
// в ответ отдаёт file_id, который дальше переиспользуем для всех остальных
// получателей обычным JSON-запросом, не загружая файл заново на каждого.
async function uploadMediaGetFileId(chatId: bigint, mediaType: MediaType, buffer: Buffer, filename: string, caption: string): Promise<string | null> {
  try {
    const form = new FormData();
    form.append('chat_id', chatId.toString());
    form.append(mediaType, new Blob([new Uint8Array(buffer)]), filename);
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');

    const method = mediaType === 'photo' ? 'sendPhoto' : 'sendVideo';
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, { method: 'POST', body: form });
    if (!res.ok) return null;
    const data = await res.json();
    if (mediaType === 'photo') {
      const sizes = data?.result?.photo;
      return sizes?.[sizes.length - 1]?.file_id || null;
    }
    return data?.result?.video?.file_id || null;
  } catch {
    return null;
  }
}

// Альбом (несколько файлов одним постом) — та же идея: первому получателю
// шлём реальные байты каждого файла через multipart (media ссылается на них
// через "attach://fileN"), из ответа забираем file_id каждого вложения и
// дальше переиспользуем их для всех остальных получателей.
async function uploadMediaGroupGetFileIds(
  chatId: bigint,
  items: { buffer: Buffer; filename: string; type: MediaType }[],
  caption: string
): Promise<UploadedMedia[] | null> {
  try {
    const form = new FormData();
    form.append('chat_id', chatId.toString());
    const mediaPayload = items.map((item, i) => ({
      type: item.type,
      media: `attach://file${i}`,
      ...(i === 0 ? { caption, parse_mode: 'HTML' } : {}),
    }));
    form.append('media', JSON.stringify(mediaPayload));
    items.forEach((item, i) => {
      form.append(`file${i}`, new Blob([new Uint8Array(item.buffer)]), item.filename);
    });

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`, { method: 'POST', body: form });
    if (!res.ok) return null;
    const data = await res.json();
    const messages = data?.result;
    if (!Array.isArray(messages) || messages.length !== items.length) return null;

    return messages.map((msg: any, i: number): UploadedMedia => {
      if (items[i].type === 'photo') {
        const sizes = msg?.photo;
        return { type: 'photo', fileId: sizes?.[sizes.length - 1]?.file_id };
      }
      return { type: 'video', fileId: msg?.video?.file_id };
    });
  } catch {
    return null;
  }
}

async function sendMediaGroupByFileIds(chatId: bigint, items: UploadedMedia[], caption: string): Promise<SendResult> {
  try {
    const mediaPayload = items.map((item, i) => ({
      type: item.type,
      media: item.fileId,
      ...(i === 0 ? { caption, parse_mode: 'HTML' } : {}),
    }));
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId.toString(), media: mediaPayload }),
    });
    if (res.ok) return 'ok';
    const data = await res.json().catch(() => null);
    return isBlocked(res.status, data) ? 'blocked' : 'error';
  } catch {
    return 'error';
  }
}

export async function POST(request: Request) {
  if (!BOT_TOKEN) return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN не настроен' }, { status: 500 });
  if (!BROADCAST_SECRET) return NextResponse.json({ error: 'BROADCAST_SECRET не настроен' }, { status: 500 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });

  const { secret, text, media } = body as { secret?: string; text?: string; media?: MediaItem[] };
  if (secret !== BROADCAST_SECRET) return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
  if (!text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'Текст поста обязателен' }, { status: 400 });
  }

  const mediaItems = Array.isArray(media) ? media.slice(0, MAX_MEDIA_ITEMS) : [];

  const recipients = await prisma.profiles.findMany({
    where: { telegram_id: { not: null } },
    select: { telegram_id: true },
  });

  if (recipients.length === 0) {
    return NextResponse.json({ total: 0, sent: 0, blocked: 0, failed: 0 });
  }

  let queue = recipients.map((r) => r.telegram_id as bigint);
  let sent = 0;
  let blocked = 0;
  let failed = 0;

  let singleFileId: string | null = null;
  let singleMediaType: MediaType | null = null;
  let groupFileIds: UploadedMedia[] | null = null;

  if (mediaItems.length === 1) {
    const item = mediaItems[0];
    const buffer = Buffer.from(item.base64, 'base64');
    const filename = `broadcast.${item.ext || (item.type === 'photo' ? 'jpg' : 'mp4')}`;
    singleFileId = await uploadMediaGetFileId(queue[0], item.type, buffer, filename, text);
    singleMediaType = item.type;
    if (singleFileId) {
      sent += 1;
      queue = queue.slice(1);
    }
    // Если загрузка не удалась — просто шлём всем как текст ниже.
  } else if (mediaItems.length >= 2) {
    const buffers = mediaItems.map((item, i) => ({
      buffer: Buffer.from(item.base64, 'base64'),
      filename: `broadcast${i}.${item.ext || (item.type === 'photo' ? 'jpg' : 'mp4')}`,
      type: item.type,
    }));
    groupFileIds = await uploadMediaGroupGetFileIds(queue[0], buffers, text);
    if (groupFileIds) {
      sent += 1;
      queue = queue.slice(1);
    }
    // Если загрузка альбома не удалась — тоже откатываемся на обычный текст.
  }

  for (let i = 0; i < queue.length; i += BATCH_SIZE) {
    const batch = queue.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((chatId) => {
        if (groupFileIds) return sendMediaGroupByFileIds(chatId, groupFileIds!, text);
        if (singleFileId && singleMediaType) return sendMediaByFileId(chatId, singleMediaType, singleFileId, text);
        return sendTelegramText(chatId, text);
      })
    );
    results.forEach((result) => {
      if (result === 'ok') sent += 1;
      else if (result === 'blocked') blocked += 1;
      else failed += 1;
    });
    if (i + BATCH_SIZE < queue.length) await sleep(BATCH_DELAY_MS);
  }

  return NextResponse.json({ total: recipients.length, sent, blocked, failed });
}
