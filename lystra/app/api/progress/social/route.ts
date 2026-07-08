export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const body = await req.json();
    const action = body.action; // 'share' или 'add_friend'
    const friend_id = body.friend_id;

    if (!action) return NextResponse.json({ error: 'Action is required' }, { status: 400 });

    // 1. Получаем текущий профиль
    const profile = await prisma.profiles.findUnique({
      where: { id: userId },
      select: { xp: true, level: true }
    });

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // 2. Выдаем XP (+15 XP за социальные взаимодействия)
    const currentXp = profile.xp || 0;
    const currentLevel = profile.level || 1;
    
    const newXp = currentXp + 15;
    const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
    const leveledUp = newLevel > currentLevel;

    await prisma.profiles.update({
      where: { id: userId },
      data: { xp: newXp, level: newLevel }
    });

    // 3. Проверяем и выдаем социальные ачивки и связи
    const newAchievements: string[] = [];

    const awardAchievement = async (achievementName: string) => {
      try {
        await prisma.achievements.create({
          data: { user_id: userId, achievement_name: achievementName }
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
          data: { user_id: userId, friend_id: friend_id } // status по умолчанию будет "pending"
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