import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Авторизация через новую систему NextAuth
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;

    // 1. Получаем текущий профиль
    const profile = await prisma.profiles.findUnique({
      where: { id: userId },
      select: { xp: true, level: true }
    });

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // 2. Считаем избранные жанры через универсальную таблицу collections
    const totalFavorites = await prisma.collections.count({
      where: { 
        user_id: userId,
        item_type: 'genre'
      }
    });

    // 3. Выдаем +20 XP за добавление
    const currentXp = profile.xp || 0;
    const currentLevel = profile.level || 1;
    
    const newXp = currentXp + 20;
    const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
    const leveledUp = newLevel > currentLevel;

    await prisma.profiles.update({
      where: { id: userId },
      data: { xp: newXp, level: newLevel }
    });

    // 4. Проверяем и выдаем ачивки ветки "Куратор"
    const newAchievements: string[] = [];

    const awardAchievement = async (achievementName: string) => {
      try {
        await prisma.achievements.create({
          data: { 
            user_id: userId, 
            achievement_name: achievementName 
          }
        });
        newAchievements.push(achievementName);
      } catch (e) {
        // Если ачивка уже есть, Prisma отменит запись из-за @@unique. Игнорируем ошибку.
      }
    };

    if (totalFavorites >= 1) await awardAchievement('first_love');
    if (totalFavorites >= 10) await awardAchievement('collector');
    if (totalFavorites >= 50) await awardAchievement('curator');

    return NextResponse.json({
      success: true,
      leveledUp,
      newLevel,
      newAchievements
    });

  } catch (error: any) {
    console.error('Favorite Progress Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}