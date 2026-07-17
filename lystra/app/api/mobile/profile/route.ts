import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';

const SECRET = process.env.AUTH_SECRET || 'lystra-super-secret-key';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ message: 'Нет токена' }, { status: 401 });

    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, SECRET);

    const profile = await prisma.profiles.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        username: true,
        first_name: true,
        avatar_url: true,
        bio: true,
        favorite_genres: true,
        xp: true,
        level: true,
        total_spins: true,
        total_searches: true,
        notify_daily_genre: true,
        timezone: true,
        last_active_at: true,
        active_title_id: true,
        role: true,
        title: true,
        created_at: true,
        // password_hash сознательно исключён — незачем отдавать его клиенту
      }
    });

    const dbAchievements = await prisma.achievements.findMany({
      where: { user_id: decoded.id }
    });

    // Форматируем под старый формат, который ждёт мобилка
    const achievements = dbAchievements.map(item => ({
      unlocked_at: item.unlocked_at,
      achievements: {
        id: item.achievement_name,
        name: item.achievement_name,
        description: '',
        icon_name: 'Trophy' // Мобилка всё равно сама подтягивает переводы и нужные иконки по ID
      }
    }));

    return NextResponse.json({ profile, achievements });
  } catch (error) {
    return NextResponse.json({ message: 'Ошибка авторизации' }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ message: 'Нет токена' }, { status: 401 });

    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, SECRET);

    const body = await request.json();
    const { username, bio, avatar_base64, avatar_ext, clear_avatar, notify_daily_genre } = body;

    let avatarUrl = undefined;

    // Если пользователь удалил фото
    if (clear_avatar) {
      avatarUrl = null;
    } 
    // Если пользователь загрузил новое фото
    else if (avatar_base64 && avatar_ext) {
      const buffer = Buffer.from(avatar_base64, 'base64');
      const fileName = `${decoded.id}-${Date.now()}.${avatar_ext}`;
      const publicDir = path.join(process.cwd(), 'public', 'avatars');
      
      // На всякий случай проверяем, есть ли папка, если нет - создаем
      await fs.mkdir(publicDir, { recursive: true });
      
      const filePath = path.join(publicDir, fileName);
      await fs.writeFile(filePath, buffer);

      // Ссылка, которая сохранится в базу
      avatarUrl = `/avatars/${fileName}`;
    }

    const updateData: any = {};
    if (username !== undefined) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;
    if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;
    if (notify_daily_genre !== undefined) updateData.notify_daily_genre = notify_daily_genre;

    // telegram_id — BigInt, JSON.stringify не умеет его сериализовать; явный select
    // (как в GET) исключает его из ответа вместо того, чтобы отдавать всю строку как есть.
    const updatedProfile = await prisma.profiles.update({
      where: { id: decoded.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        first_name: true,
        avatar_url: true,
        bio: true,
        favorite_genres: true,
        xp: true,
        level: true,
        total_spins: true,
        total_searches: true,
        notify_daily_genre: true,
        timezone: true,
        last_active_at: true,
        active_title_id: true,
        role: true,
        title: true,
        created_at: true,
      },
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Ошибка обновления' }, { status: 500 });
  }
}