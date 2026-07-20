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
    if (!userId) return NextResponse.json({ isFavorited: false });

    const { searchParams } = new URL(req.url);
    const genre = searchParams.get('genre');

    if (!genre) return NextResponse.json({ isFavorited: false });

    // Проверяем в новой таблице
    let countColls = 0;
    try {
      countColls = await prisma.collections.count({
        where: { user_id: userId, item_type: 'genre', item_id: genre }
      });
    } catch(e) {}

    // Проверяем в старой таблице
    let countOld = 0;
    try {
      countOld = await (prisma as any).favorites.count({
        where: { user_id: userId, genre_name: genre }
      });
    } catch(e) {}

    return NextResponse.json({ isFavorited: countColls > 0 || countOld > 0 }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (error) {
    return NextResponse.json({ isFavorited: false });
  }
}