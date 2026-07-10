export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const SECRET = process.env.AUTH_SECRET || 'lystra-super-secret-key';

export async function POST(req: Request) {
  try {
    let userId: string | null = null;

    // 1. Сначала пытаемся прочитать мобильный токен (Bearer)
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded: any = jwt.verify(token, SECRET);
        userId = decoded.id;
      } catch (e) {
        // Если токен неверный, просто идем дальше (возможно, это запрос с веб-сайта)
      }
    }

    // 2. Если мобильного токена нет, проверяем куки веб-портала (NextAuth)
    if (!userId) {
      const session = await auth();
      if (session?.user?.id) {
        userId = session.user.id;
      }
    }

    // 3. Если юзер не найден ни там, ни там — блокируем
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const action = body.action; // 'share' или 'add_friend'
    const friend_id = body.friend_id;

    if (!action) return NextResponse.json({ error: 'Action is required' }, { status: 400 });

    // 4. Получаем текущий профиль
    const profile = await prisma.profiles.findUnique({
      where: { id: userId },
      select: { xp: true, level: true }
    });

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // 5. Выдаем XP (+15 XP за социальные взаимодействия)
    const currentXp = profile.xp || 0;
    const currentLevel = profile.level || 1;
    
    const newXp = currentXp + 15;
    const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
    const leveledUp = newLevel > currentLevel;

    await prisma.profiles.update({
      where: { id: userId },
      data: { xp: newXp, level: newLevel }
    });

    // 6. Проверяем и выдаем социальные ачивки и связи
    const newAchievements: string[] = [];

    const awardAchievement = async (achievementName: string) => {
      try {
        await prisma.achievements.create({
          data: { user_id: userId as string, achievement_name: achievementName }
        });
        newAchievements.push(achievementName);
      } catch (e) {
        // Если ачивка уже есть, сработает уникальное ограничение Prisma, просто игнорируем
      }
    };

    if (action === 'share') {
      await awardAchievement('influencer');
    } else if (action === 'add_friend') {
      if (!friend_id) return NextResponse.json({ error: 'Friend ID is required' }, { status: 400 });

      try {
        await prisma.friends.create({
          data: { user_id: userId as string, friend_id: friend_id } // status по умолчанию будет "pending"
        });
      } catch (e) {
        // Ошибка уникальности, если они уже друзья или заявка уже отправлена
        console.error('Ошибка записи в друзья (возможно уже есть):', e);
      }

      await awardAchievement('social_butterfly');
    }

    return NextResponse.json({
      success: true,
      leveledUp,
      newLevel,
      newAchievements
    });

  } catch (error: any) {
    console.error('Social Progress Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}