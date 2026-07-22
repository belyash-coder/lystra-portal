import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth';
import { randomDiscoverMovie, TMDB_POSTER_BASE, type RandomDiscoverFilters } from '@/lib/tmdb';
import { pickHonestRandomMovie, fetchDisplayRatings } from '@/lib/honestRandomizer';
import { attachLibraryInfo } from '@/lib/libraryLookup';

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filters: RandomDiscoverFilters = {
    genreId: searchParams.get('genreId') ?? undefined,
    countryCode: searchParams.get('country') ?? undefined,
    yearFrom: searchParams.get('yearFrom') ?? undefined,
    yearTo: searchParams.get('yearTo') ?? undefined,
  };
  const minRatingRaw = searchParams.get('minRating');
  const minRating = minRatingRaw ? Number(minRatingRaw) : null;

  try {
    if (minRating != null) {
      const pick = await pickHonestRandomMovie(filters, minRating);
      if (!pick) return NextResponse.json({ movie: null });

      const mapped = {
        tmdbId: pick.movie.id,
        title: pick.movie.title,
        originalTitle: pick.movie.original_title,
        posterUrl: pick.movie.poster_path ? `${TMDB_POSTER_BASE}${pick.movie.poster_path}` : null,
        releaseYear: pick.movie.release_date ? Number(pick.movie.release_date.slice(0, 4)) : null,
        tmdbRating: pick.movie.vote_average,
        imdbRating: pick.imdb.rating,
        imdbVotes: pick.imdb.votes,
        kpRating: pick.kp.rating,
        kpVotes: pick.kp.votes,
      };
      const [enriched] = await attachLibraryInfo(profile.id, [mapped]);
      return NextResponse.json({ movie: enriched });
    }

    const movie = await randomDiscoverMovie(filters);
    if (!movie) return NextResponse.json({ movie: null });

    const { imdb, kp } = await fetchDisplayRatings(movie.id);
    const mapped = {
      tmdbId: movie.id,
      title: movie.title,
      originalTitle: movie.original_title,
      posterUrl: movie.poster_path ? `${TMDB_POSTER_BASE}${movie.poster_path}` : null,
      releaseYear: movie.release_date ? Number(movie.release_date.slice(0, 4)) : null,
      tmdbRating: movie.vote_average,
      imdbRating: imdb.rating,
      imdbVotes: imdb.votes,
      kpRating: kp.rating,
      kpVotes: kp.votes,
    };
    const [enriched] = await attachLibraryInfo(profile.id, [mapped]);
    return NextResponse.json({ movie: enriched });
  } catch (error) {
    console.error('TMDB random discover error:', error);
    return NextResponse.json({ message: 'Ошибка запроса к TMDB' }, { status: 502 });
  }
}
