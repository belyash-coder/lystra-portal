import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentProfile } from '@/lib/auth';
import { isSharedListMember } from '@/lib/sharedLists';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { id: movieId } = await params;
  const { sharedListId } = await request.json();
  if (!sharedListId) {
    return NextResponse.json({ message: 'sharedListId обязателен' }, { status: 400 });
  }
  if (!(await isSharedListMember(sharedListId, profile.id))) {
    return NextResponse.json({ message: 'Список не найден' }, { status: 404 });
  }

  await prisma.sharedListEntry.upsert({
    where: { sharedListId_movieId: { sharedListId, movieId } },
    create: { sharedListId, movieId, addedById: profile.id },
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
  const sharedListId = searchParams.get('sharedListId');
  if (!sharedListId) {
    return NextResponse.json({ message: 'sharedListId обязателен' }, { status: 400 });
  }
  if (!(await isSharedListMember(sharedListId, profile.id))) {
    return NextResponse.json({ message: 'Список не найден' }, { status: 404 });
  }

  await prisma.sharedListEntry.deleteMany({ where: { sharedListId, movieId } });

  return NextResponse.json({ ok: true });
}
