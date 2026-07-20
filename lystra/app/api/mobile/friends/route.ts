import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { getAuthSecret } from '@/lib/authSecret';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ message: 'Нет токена' }, { status: 401 });

    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, getAuthSecret());

    // 1. Ищем ID всех друзей пользователя
    const friendsRecords = await prisma.friends.findMany({
      where: { user_id: decoded.id }
    });

    const friendIds = friendsRecords.map(f => f.friend_id);

    // 2. Достаем профили этих друзей
    if (friendIds.length > 0) {
      const friendsProfiles = await prisma.profiles.findMany({
        where: {
          id: { in: friendIds }
        },
        select: {
          id: true,
          username: true,
          avatar_url: true,
          level: true,
          bio: true
        }
      });
      return NextResponse.json(friendsProfiles);
    }

    // Если друзей нет, возвращаем пустой список
    return NextResponse.json([]);
  } catch (error) {
    console.error('Friends error:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}