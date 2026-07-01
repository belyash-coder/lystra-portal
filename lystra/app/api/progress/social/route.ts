export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  // Инициализируем клиента только в момент запроса, чтобы не крашить сборку Vercel
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    // Парсим body, чтобы понять, какое действие совершил юзер
    const body = await req.json();
    const action = body.action; // Ожидаем 'share' или 'add_friend'

    if (!action) return NextResponse.json({ error: 'Action is required' }, { status: 400 });

    // 1. Получаем текущий профиль
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp, level')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // 2. Выдаем XP (допустим, +15 XP за социальные взаимодействия)
    const currentXp = profile.xp || 0;
    const currentLevel = profile.level || 1;
    
    const newXp = currentXp + 15;
    const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
    const leveledUp = newLevel > currentLevel;

    await supabase
      .from('profiles')
      .update({ xp: newXp, level: newLevel })
      .eq('id', user.id);

    // 3. Проверяем и выдаем социальные ачивки
    const newAchievements: string[] = [];

    const awardAchievement = async (achievementId: string) => {
      // Пытаемся записать ачивку. Если она уже есть, сработает ограничение уникальности БД и ошибка проигнорируется
      const { error } = await supabase
        .from('user_achievements')
        .insert({ user_id: user.id, achievement_id: achievementId });
      
      if (!error) newAchievements.push(achievementId);
    };

    if (action === 'share') {
      await awardAchievement('influencer');
    } else if (action === 'add_friend') {
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