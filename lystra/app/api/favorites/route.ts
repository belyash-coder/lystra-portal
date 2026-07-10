import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';
const SECRET = process.env.AUTH_SECRET || 'lystra-super-secret-key';

// Вспомогательная функция для нашей "двойной авторизации"
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

// ПОЛУЧИТЬ СПИСОК ИЗБРАННОГО
export async function GET(req: Request) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId') || userId;

    const favorites = await prisma.collections.findMany({
      where: { 
        user_id: targetUserId,
        item_type: 'genre' 
      }
    });

    // Форматируем под мобилку
    const formattedFavorites = favorites.map(f => ({
      id: f.id,
      genre_name: f.item_id 
    }));

    return NextResponse.json(formattedFavorites);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ДОБАВИТЬ В ИЗБРАННОЕ
export async function POST(req: Request) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const genre_name = body.genre_name;
    if (!genre_name) return NextResponse.json({ error: 'Genre is required' }, { status: 400 });

    // Проверяем, нет ли уже такого жанра
    const existing = await prisma.collections.findFirst({
      where: { user_id: userId, item_type: 'genre', item_id: genre_name }
    });

    if (!existing) {
      await prisma.collections.create({
        data: {
          user_id: userId,
          item_type: 'genre',
          item_id: genre_name
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// УДАЛИТЬ ИЗ ИЗБРАННОГО
export async function DELETE(req: Request) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const genre_name = body.genre_name;

    await prisma.collections.deleteMany({
      where: { 
        user_id: userId,
        item_type: 'genre',
        item_id: genre_name
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}