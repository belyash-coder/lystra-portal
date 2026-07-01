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
      .select('xp, level, total_searches')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // 2. Обновляем счетчик поисков и XP
    const currentXp = profile.xp || 0;
    const currentLevel = profile.level || 1;
    const currentSearches = profile.total_searches || 0;
    
    const newXp = currentXp + 15; // +15 XP за успешный поиск
    const newSearches = currentSearches + 1;
    const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
    const leveledUp = newLevel > currentLevel;

    await supabase
      .from('profiles')
      .update({ xp: newXp, level: newLevel, total_searches: newSearches })
      .eq('id', user.id);

    // 3. Проверяем ачивку "Следопыт"
    const newAchievements: string[] = [];

    if (newSearches >= 5) {
      const { error } = await supabase
        .from('user_achievements')
        .insert({ user_id: user.id, achievement_id: 'explorer' });
      
      if (!error) newAchievements.push('explorer');
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