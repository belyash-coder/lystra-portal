import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentProfile } from '@/lib/auth';
import { isSharedListMember } from '@/lib/sharedLists';
import { ensureMovieCatalogued } from '@/lib/movieCatalog';
import type { MediaType } from '@/lib/tmdb';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { id: sharedListId } = await params;
  if (!(await isSharedListMember(sharedListId, profile.id))) {
    return NextResponse.json({ message: 'Список не найден' }, { status: 404 });
  }

  const { tmdbId, mediaType } = await request.json();
  if (!tmdbId || (mediaType !== 'movie' && mediaType !== 'tv')) {
    return NextResponse.json({ message: 'Некорректные данные' }, { status: 400 });
  }

  try {
    const movie = await ensureMovieCatalogued(mediaType as MediaType, Number(tmdbId), profile.id);
    await prisma.sharedListEntry.upsert({
      where: { sharedListId_movieId: { sharedListId, movieId: movie.id } },
      create: { sharedListId, movieId: movie.id, addedById: profile.id },
      update: {},
    });
    return NextResponse.json({ ok: true, movieId: movie.id }, { status: 201 });
  } catch (error) {
    console.error('Add movie to shared list error:', error);
    return NextResponse.json({ message: 'Не удалось добавить фильм' }, { status: 502 });
  }
}
