
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  console.log('Крон запущен. Проверяем авторизацию...');
  
  const authHeader = request.headers.get('authorization');
  
  console.log('Пришел заголовок:', authHeader);
  console.log('Сервер видит пароль:', process.env.CRON_SECRET);
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('Ошибка: Неверный или отсутствующий CRON_SECRET');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Авторизация пройдена. Получаем пользователей...');
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, push_token, last_active_at')
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
      // ВРЕМЕННО ДЛЯ ТЕСТА: отправляем пуши всем прямо сейчас без привязки к 12 часам
      notifications.push({
        to: user.push_token,
        sound: 'default',
        title: '🧪 ТЕСТ: Жанр дня готов!',
        body: `Сегодня слушаем ${genreOfTheDay}. Заходи за новой музыкой!`,
        data: { type: 'genre_of_the_day' },
      });
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