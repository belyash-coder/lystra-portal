// app/api/progress/spin/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Сервисный клиент для безопасной работы с БД со стороны сервера
export async function POST(req: Request) {
  try {
    // Сначала проверяем, существуют ли вообще ключи на сервере
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Ключи базы данных (Supabase) не найдены на сервере Vercel. Проверьте настройки Environment Variables.');
    }

    // Инициализируем клиента внутри try, чтобы в случае сбоя приложение получило понятный ответ
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Верификация пользователя по токену
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    // 2. Читаем текущий прогресс
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp, level, total_spins')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const currentXp = profile.xp || 0;
    const currentSpins = profile.total_spins || 0;
    const currentLevel = profile.level || 1;

    const newXp = currentXp + 10;
    const newSpins = currentSpins + 1;
    const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
    const leveledUp = newLevel > currentLevel;

    // 3. Обновляем профиль
    await supabase
      .from('profiles')
      .update({ xp: newXp, level: newLevel, total_spins: newSpins })
      .eq('id', user.id);

    // 4. Проверяем и выдаем ачивки
    const newAchievements: string[] = [];

    const awardAchievement = async (achievementId: string) => {
      const { error } = await supabase
        .from('user_achievements')
        .insert({ user_id: user.id, achievement_id: achievementId });
      
      // Если ошибки нет, значит ачивка получена впервые (сработает constraint в БД)
      if (!error) newAchievements.push(achievementId);
    };

    // "Проба пера"
    await awardAchievement('first_spin');

    // "Ночная сова" (учитываем серверное время или можно пробрасывать таймзону юзера с клиента)
    const currentHour = new Date().getHours();
    if (currentHour >= 0 && currentHour < 6) {
      await awardAchievement('night_owl');
    }

    // "Везунчик"
    if (newSpins >= 10) {
      await awardAchievement('lucky_ten');
    }

    // "Мастер рулетки"
    if (newSpins >= 100) {
      await awardAchievement('spin_master');
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