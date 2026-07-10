import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';
const SECRET = process.env.AUTH_SECRET || 'lystra-super-secret-key';

async function getUserId(req: Request) {
  let userId: string | null = null;
  const authHeader = req.headers.get('authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded: any = jwt.verify(authHeader.split(' ')[1], SECRET);
      userId = decoded.id;
    } catch (e) {}
  }

  if (!userId) {
    const session = await auth();
    if (session?.user?.id) userId = session.user.id;
  }
  return userId;
}

export async function GET(req: Request) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId') || userId;

    // 1. Читаем из новой таблицы collections
    let newFavs: any[] = [];
    try {
      newFavs = await prisma.collections.findMany({
        where: { user_id: targetUserId, item_type: 'genre' }
      });
    } catch (e) {}

    // 2. Читаем из старой таблицы favorites (осталась от Supabase)
    let oldFavs: any[] = [];
    try {
      oldFavs = await (prisma as any).favorites.findMany({
        where: { user_id: targetUserId }
      });
    } catch (e) {}

    // Объединяем и приводим к единому формату
    const formattedNew = newFavs.map(f => ({ id: f.id, genre_name: f.item_id || f.genre_name }));
    const formattedOld = oldFavs.map(f => ({ id: f.id, genre_name: f.genre_name || f.item_id }));

    const allFavorites = [...formattedOld, ...formattedNew];
    const uniqueFavorites = Array.from(new Map(allFavorites.map(item => [item.genre_name, item])).values());

    // Возвращаем с ЖЕСТКИМ запретом на кэширование
    return NextResponse.json(uniqueFavorites, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const genre_name = body.genre_name;
    if (!genre_name) return NextResponse.json({ error: 'Genre is required' }, { status: 400 });

    try {
      const existing = await prisma.collections.findFirst({
        where: { user_id: userId, item_type: 'genre', item_id: genre_name }
      });
      if (!existing) {
        await prisma.collections.create({
          data: { user_id: userId, item_type: 'genre', item_id: genre_name }
        });
      }
    } catch (e) {}

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const genre_name = body.genre_name;

    // Удаляем из обеих таблиц для чистоты
    try {
      await prisma.collections.deleteMany({
        where: { user_id: userId, item_type: 'genre', item_id: genre_name }
      });
    } catch (e) {}

    try {
      await (prisma as any).favorites.deleteMany({
        where: { user_id: userId, genre_name: genre_name }
      });
    } catch (e) {}

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}