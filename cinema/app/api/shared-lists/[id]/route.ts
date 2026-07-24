import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentProfile } from '@/lib/auth';
import { isSharedListMember } from '@/lib/sharedLists';
import { TMDB_POSTER_BASE } from '@/lib/tmdb';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { id } = await params;
  if (!(await isSharedListMember(id, profile.id))) {
    return NextResponse.json({ message: 'Список не найден' }, { status: 404 });
  }

  const [members, entries] = await Promise.all([
    prisma.sharedListMember.findMany({
      where: { sharedListId: id },
      include: { profile: { select: { username: true, firstName: true } } },
    }),
    prisma.sharedListEntry.findMany({
      where: { sharedListId: id },
      orderBy: { addedAt: 'desc' },
      include: { movie: true, addedBy: { select: { username: true, firstName: true } } },
    }),
  ]);

  const partnerMember = members.find((m) => m.profileId !== profile.id);

  return NextResponse.json({
    list: {
      id,
      partner: partnerMember
        ? { username: partnerMember.profile.username, firstName: partnerMember.profile.firstName }
        : null,
    },
    movies: entries.map((entry) => ({
      movieId: entry.movieId,
      mediaType: entry.movie.mediaType === 'MOVIE' ? 'movie' : 'tv',
      tmdbId: entry.movie.tmdbId,
      title: entry.movie.title,
      posterUrl: entry.movie.posterPath ? `${TMDB_POSTER_BASE}${entry.movie.posterPath}` : null,
      releaseYear: entry.movie.releaseYear,
      genres: entry.movie.genres,
      watched: entry.watched,
      addedBy: { firstName: entry.addedBy.firstName, username: entry.addedBy.username },
    })),
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { id } = await params;
  if (!(await isSharedListMember(id, profile.id))) {
    return NextResponse.json({ message: 'Список не найден' }, { status: 404 });
  }

  await prisma.sharedList.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
