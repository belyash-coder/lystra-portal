import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentProfile } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { id: movieId } = await params;
  const { listId } = await request.json();
  if (!listId) {
    return NextResponse.json({ message: 'listId обязателен' }, { status: 400 });
  }

  const list = await prisma.movieList.findFirst({ where: { id: listId, profileId: profile.id } });
  if (!list) {
    return NextResponse.json({ message: 'Список не найден' }, { status: 404 });
  }

  // Попадание в список подразумевает, что фильм в личной библиотеке — иначе он не
  // покажется в общем списке фильмов профиля (тот теперь фильтруется по WatchEntry).
  await prisma.watchEntry.upsert({
    where: { profileId_movieId: { profileId: profile.id, movieId } },
    create: { profileId: profile.id, movieId, status: 'PLANNED' },
    update: {},
  });

  await prisma.movieListEntry.upsert({
    where: { listId_movieId: { listId, movieId } },
    create: { listId, movieId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { id: movieId } = await params;
  const { searchParams } = new URL(request.url);
  const listId = searchParams.get('listId');
  if (!listId) {
    return NextResponse.json({ message: 'listId обязателен' }, { status: 400 });
  }

  const list = await prisma.movieList.findFirst({ where: { id: listId, profileId: profile.id } });
  if (!list) {
    return NextResponse.json({ message: 'Список не найден' }, { status: 404 });
  }

  await prisma.movieListEntry.deleteMany({ where: { listId, movieId } });

  return NextResponse.json({ ok: true });
}
