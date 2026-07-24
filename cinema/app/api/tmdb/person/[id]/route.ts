import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth';
import {
  getPersonDetails,
  getPersonCombinedCredits,
  TMDB_POSTER_BASE,
  type TmdbSearchResult,
} from '@/lib/tmdb';
import { attachLibraryInfo } from '@/lib/libraryLookup';

function mapCredits(items: TmdbSearchResult[]) {
  return items.map((item) => ({
    tmdbId: item.id,
    mediaType: item.media_type,
    title: item.title,
    originalTitle: item.original_title,
    posterUrl: item.poster_path ? `${TMDB_POSTER_BASE}${item.poster_path}` : null,
    releaseYear: item.release_date ? Number(item.release_date.slice(0, 4)) : null,
    tmdbRating: item.vote_average,
  }));
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { id } = await params;
  const personId = Number(id);
  if (!Number.isFinite(personId) || personId <= 0) {
    return NextResponse.json({ message: 'Некорректный id' }, { status: 400 });
  }

  try {
    const [person, credits] = await Promise.all([getPersonDetails(personId), getPersonCombinedCredits(personId)]);

    const [director, writer, producer, actor] = await Promise.all([
      attachLibraryInfo(profile.id, mapCredits(credits.director)),
      attachLibraryInfo(profile.id, mapCredits(credits.writer)),
      attachLibraryInfo(profile.id, mapCredits(credits.producer)),
      attachLibraryInfo(profile.id, mapCredits(credits.actor)),
    ]);

    return NextResponse.json({ person, roles: { director, writer, producer, actor } });
  } catch (error) {
    console.error('TMDB person error:', error);
    return NextResponse.json({ message: 'Ошибка запроса к TMDB' }, { status: 502 });
  }
}
