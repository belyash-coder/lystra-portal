import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentProfile } from '@/lib/auth';

const VALID_STATUSES = ['PLANNED', 'WATCHING', 'WATCHED'];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { id: movieId } = await params;
  const body = await request.json();
  const { status, rating } = body as { status?: string; rating?: number | null };

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ message: 'Некорректный статус' }, { status: 400 });
  }
  if (rating !== undefined && rating !== null && (rating < 1 || rating > 10)) {
    return NextResponse.json({ message: 'Оценка должна быть от 1 до 10' }, { status: 400 });
  }

  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) {
    return NextResponse.json({ message: 'Фильм не найден' }, { status: 404 });
  }

  const entry = await prisma.watchEntry.upsert({
    where: { profileId_movieId: { profileId: profile.id, movieId } },
    create: {
      profileId: profile.id,
      movieId,
      status: (status as 'PLANNED' | 'WATCHING' | 'WATCHED') ?? 'PLANNED',
      rating: rating ?? null,
    },
    update: {
      ...(status ? { status: status as 'PLANNED' | 'WATCHING' | 'WATCHED' } : {}),
      ...(rating !== undefined ? { rating } : {}),
    },
  });

  return NextResponse.json({ entry });
}
