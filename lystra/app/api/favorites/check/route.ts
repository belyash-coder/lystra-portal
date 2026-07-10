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
    if (!userId) return NextResponse.json({ isFavorited: false });

    const { searchParams } = new URL(req.url);
    const genre = searchParams.get('genre');

    if (!genre) return NextResponse.json({ isFavorited: false });

    const count = await prisma.collections.count({
      where: { 
        user_id: userId,
        item_type: 'genre',
        item_id: genre
      }
    });

    return NextResponse.json({ isFavorited: count > 0 });
  } catch (error) {
    return NextResponse.json({ isFavorited: false });
  }
}