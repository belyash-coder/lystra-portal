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

    // 1. Получаем текущий профиль
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp, level')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // 2. Считаем, сколько всего жанров у юзера в избранном
    const { count, error: countError } = await supabase
      .from('favorite_genres')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const totalFavorites = count || 0;

    // 3. Выдаем +20 XP за каждое добавление в избранное
    const currentXp = profile.xp || 0;
    const currentLevel = profile.level || 1;
    
    const newXp = currentXp + 20;
    const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
    const leveledUp = newLevel > currentLevel;

    await supabase
      .from('profiles')
      .update({ xp: newXp, level: newLevel })
      .eq('id', user.id);

    // 4. Проверяем и выдаем ачивки ветки "Куратор"
    const newAchievements: string[] = [];

    const awardAchievement = async (achievementId: string) => {
      const { error } = await supabase
        .from('user_achievements')
        .insert({ user_id: user.id, achievement_id: achievementId });
      
      if (!error) newAchievements.push(achievementId);
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