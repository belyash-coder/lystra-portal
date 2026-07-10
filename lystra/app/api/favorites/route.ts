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

    let allFavorites: any[] = [];

    // Убрали скрытие ошибок. Если таблица collections названа иначе, это сломается с понятной ошибкой.
    const newFavs = await prisma.collections.findMany({
      where: { user_id: targetUserId, item_type: 'genre' }
    });
    
    // Читаем всё, подстраховываясь на любые названия колонок
    allFavorites.push(...newFavs.map((f: any) => ({ 
      id: f.id?.toString(), 
      genre_name: f.item_id || f.genre_name || f.title || f.name || f.genre 
    })));

    // Пытаемся безопасно прочитать старую таблицу, если она еще жива
    try {
      const oldFavs = await (prisma as any).favorites.findMany({
        where: { user_id: targetUserId }
      });
      allFavorites.push(...oldFavs.map((f: any) => ({ 
        id: f.id?.toString(), 
        genre_name: f.genre_name || f.item_id 
      })));
    } catch (e) {
      console.log("Старой таблицы favorites больше нет, игнорируем.");
    }

    const uniqueFavorites = Array.from(new Map(allFavorites.map(item => [item.genre_name, item])).values());

    return NextResponse.json(uniqueFavorites, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (error: any) {
    console.error("GET /api/favorites ERROR:", error);
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

    // ВАЖНО: Мы убрали блок catch. 
    // Теперь, если база упадет при записи, мобилка получит 500 ошибку и покажет Alert!
    const existing = await prisma.collections.findFirst({
      where: { user_id: userId, item_type: 'genre', item_id: genre_name }
    });
    
    if (!existing) {
      await prisma.collections.create({
        data: { user_id: userId, item_type: 'genre', item_id: genre_name }
      });
    }

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error: any) {
    console.error("POST /api/favorites ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const genre_name = body.genre_name;

    await prisma.collections.deleteMany({
      where: { user_id: userId, item_type: 'genre', item_id: genre_name }
    });

    try {
      await (prisma as any).favorites.deleteMany({
        where: { user_id: userId, genre_name: genre_name }
      });
    } catch (e) {}

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error: any) {
    console.error("DELETE /api/favorites ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}