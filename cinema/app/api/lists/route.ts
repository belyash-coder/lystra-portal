import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentProfile } from '@/lib/auth';

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const lists = await prisma.movieList.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { entries: true } } },
  });

  return NextResponse.json({
    lists: lists.map((list) => ({ id: list.id, name: list.name, movieCount: list._count.entries })),
  });
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { name } = await request.json();
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ message: 'Название обязательно' }, { status: 400 });
  }

  try {
    const list = await prisma.movieList.create({
      data: { profileId: profile.id, name: name.trim() },
    });
    return NextResponse.json({ list: { id: list.id, name: list.name, movieCount: 0 } }, { status: 201 });
  } catch (error) {
    console.error('Create list error:', error);
    return NextResponse.json({ message: 'Список с таким названием уже есть' }, { status: 409 });
  }
}
