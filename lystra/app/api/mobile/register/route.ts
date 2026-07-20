import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getAuthSecret } from '@/lib/authSecret';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ message: 'Email и пароль обязательны' }, { status: 400 });
    }

    const existingUser = await prisma.profiles.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return NextResponse.json({ message: 'Этот Email уже занят' }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const username = email.split('@')[0];

    const user = await prisma.profiles.create({
      data: {
        email: email.toLowerCase(),
        password_hash,
        username,
        level: 1,
        xp: 0,
        total_spins: 0
      }
    });

    const token = jwt.sign({ id: user.id, email: user.email }, getAuthSecret(), { expiresIn: '30d' });

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}