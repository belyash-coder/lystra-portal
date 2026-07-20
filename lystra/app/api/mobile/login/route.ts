import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { awardXp, unlockAchievement } from '@/lib/gamification';
import { getAuthSecret } from '@/lib/authSecret';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ message: 'Email и пароль обязательны' }, { status: 400 });
    }

    const user = await prisma.profiles.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user || !user.password_hash) {
      return NextResponse.json({ message: 'Неверные учетные данные' }, { status: 401 });
    }

    const passwordsMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordsMatch) {
      return NextResponse.json({ message: 'Неверные учетные данные' }, { status: 401 });
    }

    // Разовый бонус за единый профиль: тот же аккаунт подключён и на портале, и в приложении
    const newlyLinked = await unlockAchievement(user.id, 'mobile_connected');
    if (newlyLinked) {
      await awardXp(user.id, 10);
    }

    // Генерируем токен на 30 дней
    const token = jwt.sign({ id: user.id, email: user.email }, getAuthSecret(), { expiresIn: '30d' });

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}