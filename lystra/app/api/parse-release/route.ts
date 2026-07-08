import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { url, genre } = await request.json();

    // Защита: проверяем, авторизован ли пользователь через NextAuth
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Только авторизованные пользователи могут добавлять релизы' }, { status: 401 });
    }

    if (!url) {
      return NextResponse.json({ error: 'URL обязателен' }, { status: 400 });
    }

    const isSoundCloud = url.includes('soundcloud.com');
    const isBandcamp = url.includes('bandcamp.com');

    if (!isSoundCloud && !isBandcamp) {
      return NextResponse.json({ error: 'Поддерживаются только ссылки на SoundCloud и Bandcamp' }, { status: 400 });
    }

    let title = '';
    let artistName = '';
    let coverUrl = '';
    let audioMarkerPath = '';

    if (isSoundCloud) {
      const oEmbedUrl = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`;
      const response = await fetch(oEmbedUrl);
      if (!response.ok) throw new Error('Не удалось получить данные из SoundCloud.');
      
      const data = await response.json();
      title = data.title || 'Неизвестный трек';
      artistName = data.author_name || 'Неизвестный артист';
      coverUrl = data.thumbnail_url || '';
      
      if (coverUrl && coverUrl.startsWith('//')) {
        coverUrl = `https:${coverUrl}`;
      }
      audioMarkerPath = url;
    }

    if (isBandcamp) {
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!response.ok) throw new Error('Не удалось загрузить страницу Bandcamp.');
      
      const html = await response.text();
      const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
      const ogTitle = titleMatch ? titleMatch[1] : '';

      title = ogTitle;
      artistName = 'Неизвестный артист';

      if (ogTitle.includes(', by ')) {
        [title, artistName] = ogTitle.split(', by ');
      } else if (ogTitle.includes(' by ')) {
        [title, artistName] = ogTitle.split(' by ');
      }

      const imageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
      coverUrl = imageMatch ? imageMatch[1] : '';
      
      if (coverUrl && coverUrl.startsWith('//')) {
        coverUrl = `https:${coverUrl}`;
      }
      audioMarkerPath = url;
    }

    // ВНИМАНИЕ: Таблицы artists, releases и tracks удалены из schema.prisma!
    // Прямая запись в БД отключена до принятия продуктового решения о возврате этих моделей.
    console.warn(`[Parse Release] Данные получены: ${title} от ${artistName}, но таблицы в БД отсутствуют.`);

    return NextResponse.json({ 
      success: true, 
      message: 'Ссылка успешно обработана (без сохранения в БД).' 
    });

  } catch (error: any) {
    console.error("ОШИБКА ПАРСЕРА:", error);
    return NextResponse.json({ 
      error: error.message || 'Ошибка при обработке ссылки',
    }, { status: 500 });
  }
}