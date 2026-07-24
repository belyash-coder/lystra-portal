import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentProfile } from '@/lib/auth';
import { isSharedListMember } from '@/lib/sharedLists';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; movieId: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { id: sharedListId, movieId } = await params;
  if (!(await isSharedListMember(sharedListId, profile.id))) {
    return NextResponse.json({ message: 'Список не найден' }, { status: 404 });
  }

  const { watched } = await request.json();
  if (typeof watched !== 'boolean') {
    return NextResponse.json({ message: 'watched обязателен' }, { status: 400 });
  }

  const result = await prisma.sharedListEntry.updateMany({
    where: { sharedListId, movieId },
    data: { watched, watchedAt: watched ? new Date() : null },
  });
  if (result.count === 0) {
    return NextResponse.json({ message: 'Фильм не найден в списке' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; movieId: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { id: sharedListId, movieId } = await params;
  if (!(await isSharedListMember(sharedListId, profile.id))) {
    return NextResponse.json({ message: 'Список не найден' }, { status: 404 });
  }

  await prisma.sharedListEntry.deleteMany({ where: { sharedListId, movieId } });
  return NextResponse.json({ ok: true });
}
