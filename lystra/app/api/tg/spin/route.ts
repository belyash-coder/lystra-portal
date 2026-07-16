import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const SECRET = process.env.AUTH_SECRET || 'lystra-super-secret-key';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ message: 'Нет токена' }, { status: 401 });

    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, SECRET);

    const profile = await prisma.profiles.update({
      where: { id: decoded.id },
      data: { total_spins: { increment: 1 } },
      select: { total_spins: true },
    });

    return NextResponse.json({ total_spins: profile.total_spins });
  } catch (error) {
    return NextResponse.json({ message: 'Ошибка авторизации' }, { status: 401 });
  }
}
