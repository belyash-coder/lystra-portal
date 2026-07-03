
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  console.log('Крон запущен. Проверяем авторизацию...');
  
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('Ошибка: Неверный или отсутствующий CRON_SECRET');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Авторизация пройдена. Получаем пользователей...');
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, push_token, timezone, last_active_at')
      .not('push_token', 'is', null);

    if (error) throw error;
    if (!users || users.length === 0) {
      console.log('Нет пользователей с push_token.');
      return NextResponse.json({ message: 'No users to notify' });
    }

    const notifications = [];
    const now = new Date();
    const genreOfTheDay = "Synthwave"; // Заглушка

    for (const user of users) {
      if (!user.timezone) continue;

      let localHour = -1;
      try {
        const formatter = new Intl.DateTimeFormat('en-US', { 
          hour: 'numeric', hour12: false, timeZone: user.timezone 
        });
        localHour = parseInt(formatter.format(now));
      } catch (e) {
        continue;
      }

      // Если у пользователя сейчас 12:00 дня
      if (localHour === 12) {
        // 1. Пуш Жанра Дня
        notifications.push({
          to: user.push_token,
          sound: 'default',
          title: '🌟 Жанр дня готов!',
          body: `Сегодня слушаем ${genreOfTheDay}. Заходи за новой музыкой!`,
          data: { type: 'genre_of_the_day' },
        });

        // 2. Проверка неактивности
        if (user.last_active_at) {
          const lastActive = new Date(user.last_active_at);
          const diffMs = now.getTime() - lastActive.getTime();
          const daysInactive = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          if (daysInactive === 5) {
            notifications.push({ to: user.push_token, sound: 'default', title: '🎲 Рулетка скучает!', body: 'Давно не искали новую музыку? Пора крутануть барабан!', data: { type: 'roulette_reminder' }});
          } else if (daysInactive === 10) {
            notifications.push({ to: user.push_token, sound: 'default', title: '📡 Радары заскучали', body: 'В LYSTRA появилось много свежих жанров, пока тебя не было. Пора крутить барабан!', data: { type: 'absence_10_days' }});
          } else if (daysInactive === 30) {
            notifications.push({ to: user.push_token, sound: 'default', title: '😱 Месяц без новых открытий', body: 'Твоя музыкальная коллекция покрывается пылью. Возвращайся в игру, рулетка ждет!', data: { type: 'absence_30_days' }});
          }
        }
      }
    }

    console.log(`Подготовлено ${notifications.length} пушей для отправки.`);

    if (notifications.length > 0) {
      const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notifications),
      });
      const expoData = await expoRes.json();
      console.log('Ответ от Expo:', expoData);
    }

    return NextResponse.json({ success: true, sentCount: notifications.length });

  } catch (error: any) {
    console.error('Ошибка выполнения крона:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}