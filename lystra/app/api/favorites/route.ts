import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import { getAuthSecret } from '@/lib/authSecret';

export const dynamic = 'force-dynamic';

async function getUserId(req: Request) {
  let userId: string | null = null;
  const authHeader = req.headers.get('authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded: any = jwt.verify(authHeader.split(' ')[1], getAuthSecret());
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
    // По умолчанию 'collection' — чтобы не сломать поведение мобильного приложения,
    // которое этот параметр никогда не передаёт.
    const listType = searchParams.get('list_type') || 'collection';

    let allFavorites: any[] = [];

    // Убрали скрытие ошибок. Если таблица collections названа иначе, это сломается с понятной ошибкой.
    const newFavs = await prisma.collections.findMany({
      where: { user_id: targetUserId, item_type: 'genre', list_type: listType }
    });
    
    // Читаем всё, подстраховываясь на любые названия колонок
    allFavorites.push(...newFavs.map((f: any) => ({ 
      id: f.id?.toString(), 
      genre_name: f.item_id || f.genre_name || f.title || f.name || f.genre 
    })));

    // Легаси-таблица не знает про list_type — она относится только к обычному "избранному".
    if (listType === 'collection') {
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
    const listType = body.list_type || 'collection';
    if (!genre_name) return NextResponse.json({ error: 'Genre is required' }, { status: 400 });

    // ВАЖНО: Мы убрали блок catch.
    // Теперь, если база упадет при записи, мобилка получит 500 ошибку и покажет Alert!
    const existing = await prisma.collections.findFirst({
      where: { user_id: userId, item_type: 'genre', item_id: genre_name, list_type: listType }
    });

    if (!existing) {
      await prisma.collections.create({
        data: { user_id: userId, item_type: 'genre', item_id: genre_name, list_type: listType }
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
    const listType = body.list_type || 'collection';

    await prisma.collections.deleteMany({
      where: { user_id: userId, item_type: 'genre', item_id: genre_name, list_type: listType }
    });

    if (listType === 'collection') {
      try {
        await (prisma as any).favorites.deleteMany({
          where: { user_id: userId, genre_name: genre_name }
        });
      } catch (e) {}
    }

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error: any) {
    console.error("DELETE /api/favorites ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}