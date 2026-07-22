import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentProfile } from '@/lib/auth';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { id } = await params;
  const result = await prisma.movieList.deleteMany({ where: { id, profileId: profile.id } });
  if (result.count === 0) {
    return NextResponse.json({ message: 'Список не найден' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
