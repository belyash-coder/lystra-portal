import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { awardXp, syncPortalAchievements } from '@/lib/gamification';

export async function POST(request: Request) {
  try {
    const { url, genre, tags: rawTags } = await request.json();

    const tags = Array.isArray(rawTags)
      ? Array.from(new Set(
          rawTags
            .filter((t: unknown): t is string => typeof t === 'string')
            .map((t: string) => t.trim().toLowerCase())
            .filter(Boolean)
        )).slice(0, 8)
      : [];

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

    if (!title) {
      return NextResponse.json({ error: 'Не удалось распознать данные релиза по ссылке' }, { status: 400 });
    }

    const artist = (await prisma.artists.findFirst({ where: { stage_name: artistName } }))
      ?? (await prisma.artists.create({ data: { stage_name: artistName } }));

    const release = await prisma.releases.create({
      data: {
        title,
        genre,
        tags,
        cover_path: coverUrl || null,
        artist_id: artist.id,
        user_id: session.user.id as string,
        tracks: {
          create: {
            title,
            audio_path: audioMarkerPath,
          },
        },
      },
    });

    await awardXp(session.user.id as string, 25);
    await syncPortalAchievements(session.user.id as string);

    return NextResponse.json({
      success: true,
      releaseId: release.id,
    });

  } catch (error: any) {
    console.error("ОШИБКА ПАРСЕРА:", error);
    return NextResponse.json({ 
      error: error.message || 'Ошибка при обработке ссылки',
    }, { status: 500 });
  }
}