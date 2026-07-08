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

    // 1. Читаем текущий прогресс, включая добавленный total_spins
    const profile = await prisma.profiles.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, total_spins: true }
    });

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const currentXp = profile.xp || 0;
    const currentLevel = profile.level || 1;
    const currentSpins = profile.total_spins || 0;

    const newXp = currentXp + 10;
    const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
    const leveledUp = newLevel > currentLevel;
    const newSpins = currentSpins + 1;

    // 2. Обновляем профиль (XP, Level и счетчик круток)
    await prisma.profiles.update({
      where: { id: userId },
      data: { xp: newXp, level: newLevel, total_spins: newSpins }
    });

    // 3. Проверяем и выдаем ачивки
    const newAchievements: string[] = [];

    const awardAchievement = async (achievementName: string) => {
      try {
        await prisma.achievements.create({
          data: { user_id: userId, achievement_name: achievementName }
        });
        newAchievements.push(achievementName);
      } catch (e) {
        // Если ошибка уникальности (ачивка уже есть) — игнорируем
      }
    };

    // "Проба пера" (выдается всегда, БД сама отсечет дубликат)
    await awardAchievement('first_spin');

    // "Счастливчик" (10 круток)
    if (newSpins >= 10) {
      await awardAchievement('lucky_ten');
    }

    // "Мастер рулетки" (100 круток)
    if (newSpins >= 100) {
      await awardAchievement('spin_master');
    }

    // "Ночная сова" (с 00:00 до 06:00)
    const currentHour = new Date().getHours();
    if (currentHour >= 0 && currentHour < 6) {
      await awardAchievement('night_owl');
    }

    return NextResponse.json({
      success: true,
      leveledUp,
      newLevel,
      newAchievements
    });

  } catch (error: any) {
    console.error('Spin Progress Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}