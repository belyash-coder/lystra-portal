import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentProfile } from '@/lib/auth';
import { getMovieExtras, TMDB_POSTER_BASE, TMDB_PROFILE_BASE, TMDB_LOGO_BASE } from '@/lib/tmdb';
import { attachLibraryInfo } from '@/lib/libraryLookup';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { id } = await params;
  const movie = await prisma.movie.findUnique({ where: { id }, select: { tmdbId: true } });
  if (!movie) {
    return NextResponse.json({ message: 'Фильм не найден' }, { status: 404 });
  }

  try {
    const extras = await getMovieExtras(movie.tmdbId);
    const similarMapped = extras.similar.map((m) => ({
      tmdbId: m.id,
      title: m.title,
      originalTitle: m.original_title,
      posterUrl: m.poster_path ? `${TMDB_POSTER_BASE}${m.poster_path}` : null,
      releaseYear: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
      tmdbRating: m.vote_average,
    }));

    return NextResponse.json({
      trailerKey: extras.trailerKey,
      director: extras.director,
      cast: extras.cast.map((c) => ({
        id: c.id,
        name: c.name,
        character: c.character,
        photoUrl: c.profile_path ? `${TMDB_PROFILE_BASE}${c.profile_path}` : null,
      })),
      similar: await attachLibraryInfo(profile.id, similarMapped),
      watchProviders: extras.watchProviders
        ? {
            link: extras.watchProviders.link,
            flatrate: extras.watchProviders.flatrate.map((p) => ({
              name: p.provider_name,
              logoUrl: `${TMDB_LOGO_BASE}${p.logo_path}`,
            })),
            rent: extras.watchProviders.rent.map((p) => ({
              name: p.provider_name,
              logoUrl: `${TMDB_LOGO_BASE}${p.logo_path}`,
            })),
            buy: extras.watchProviders.buy.map((p) => ({
              name: p.provider_name,
              logoUrl: `${TMDB_LOGO_BASE}${p.logo_path}`,
            })),
          }
        : null,
    });
  } catch (error) {
    console.error('TMDB extras error:', error);
    return NextResponse.json({ message: 'Не удалось получить дополнительные данные' }, { status: 502 });
  }
}
