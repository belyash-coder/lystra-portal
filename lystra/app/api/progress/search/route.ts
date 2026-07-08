export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    // Авторизация через NextAuth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;

    // 1. Получаем текущий профиль (включая счетчик total_searches)
    const profile = await prisma.profiles.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, total_searches: true }
    });

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // 2. Обновляем XP и счетчик поисков
    const currentXp = profile.xp || 0;
    const currentLevel = profile.level || 1;
    const currentSearches = profile.total_searches || 0;
    
    const newXp = currentXp + 15; // +15 XP за успешный поиск
    const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
    const leveledUp = newLevel > currentLevel;
    const newSearches = currentSearches + 1;

    await prisma.profiles.update({
      where: { id: userId },
      data: { xp: newXp, level: newLevel, total_searches: newSearches }
    });

    // 3. Выдаем ачивку "Следопыт" при первой возможности
    const newAchievements: string[] = [];

    try {
      await prisma.achievements.create({
        data: { 
          user_id: userId, 
          achievement_name: 'explorer' 
        }
      });
      newAchievements.push('explorer');
    } catch (e) {
      // Если ачивка уже получена, сработает уникальное ограничение базы, и мы просто проигнорируем ошибку
    }

    return NextResponse.json({
      success: true,
      leveledUp,
      newLevel,
      newAchievements
    });

  } catch (error: any) {
    console.error('Search Progress Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}