import { NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { url, genre } = await request.json();
    const supabase = await createClient();

    // Защита: проверяем, авторизован ли пользователь
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
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
    let durationSec = 180; // Дефолтное значение

    if (isSoundCloud) {
      const oEmbedUrl = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`;
      const response = await fetch(oEmbedUrl);
      if (!response.ok) throw new Error('Не удалось получить данные из SoundCloud. Проверьте правильность ссылки.');
      
      const data = await response.json();
      title = data.title || 'Неизвестный трек';
      artistName = data.author_name || 'Неизвестный артист';
      coverUrl = data.thumbnail_url || '';
      
      // Если площадка отдала ссылку без протокола, принудительно добавляем https:
      if (coverUrl && coverUrl.startsWith('//')) {
        coverUrl = `https:${coverUrl}`;
      }
      
      audioMarkerPath = url; // Для SoundCloud храним оригинальный URL
    }

    if (isBandcamp) {
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!response.ok) throw new Error('Не удалось загрузить страницу Bandcamp. Проверьте правильность ссылки.');
      
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
      
      // Если площадка отдала ссылку без протокола, принудительно добавляем https:
      if (coverUrl && coverUrl.startsWith('//')) {
        coverUrl = `https:${coverUrl}`;
      }

      // Плеер нам больше не нужен, поэтому просто сохраняем саму ссылку как источник
      audioMarkerPath = url;
    }

    // --- Интеграция с базой данных Supabase ---

    // 1. Проверяем или создаем артиста (БЕЗОПАСНЫЙ ПОИСК через limit(1) вместо maybeSingle)
    let artistId;
    const { data: existingArtists, error: searchError } = await supabase
      .from('artists')
      .select('id')
      .ilike('stage_name', artistName.trim())
      .limit(1);

    if (searchError) throw searchError;

    if (existingArtists && existingArtists.length > 0) {
      artistId = existingArtists[0].id;
    } else {
      const { data: newArtist, error: artistError } = await supabase
        .from('artists')
        .insert({ stage_name: artistName.trim() })
        .select('id')
        .single();
      
      if (artistError) throw artistError;
      artistId = newArtist.id;
    }

    // Определяем тип релиза на основе чистого URL
    const releaseType = isBandcamp && audioMarkerPath.includes('/track/') ? 'track' : 'album';

    // 2. Создаем релиз (в cover_path сохраняем внешний http-адрес обложки)
    const { data: newRelease, error: releaseError } = await supabase
      .from('releases')
      .insert({
        title: title.trim(),
        genre: genre,
        artist_id: artistId,
        cover_path: coverUrl,
        release_type: releaseType 
      })
      .select('id')
      .single();

    if (releaseError) throw releaseError;

    // 3. Создаем трек
    const { error: trackError } = await supabase
      .from('tracks')
      .insert({
        title: title.trim(),
        release_id: newRelease.id,
        duration: durationSec,
        audio_path: audioMarkerPath
      });

    if (trackError) throw trackError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("ОШИБКА ПАРСЕРА:", error);
    
    // Возвращаем точный текст ошибки прямо в форму на фронтенд
    return NextResponse.json({ 
      error: error.message || 'Ошибка базы данных при сохранении',
      details: error.details || error.hint || ''
    }, { status: 500 });
  }
}