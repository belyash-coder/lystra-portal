import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth';
import {
  discoverPage,
  discoverPageStableDate,
  fetchTrendingAll,
  TMDB_POSTER_BASE,
  ANIMATION_GENRE_ID,
  type MediaType,
  type CatalogSort,
  type DiscoverFilters,
} from '@/lib/tmdb';
import { attachLibraryInfo } from '@/lib/libraryLookup';
import type { FeedName } from '@/lib/types';

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const feed = searchParams.get('feed') as FeedName | null;
  const mediaTypeParam = searchParams.get('mediaType');
  const mediaType: MediaType = mediaTypeParam === 'tv' ? 'tv' : 'movie';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const sort = (searchParams.get('sort') as CatalogSort) || 'popularity';

  const filters: DiscoverFilters = {
    genreId: searchParams.get('genreId') ?? undefined,
    yearFrom: searchParams.get('yearFrom') ?? undefined,
    yearTo: searchParams.get('yearTo') ?? undefined,
    minRating: searchParams.get('minRating') ?? undefined,
  };

  if (!feed || !['trending', 'popular', 'animation'].includes(feed)) {
    return NextResponse.json({ message: 'Некорректная лента' }, { status: 400 });
  }

  try {
    let results;
    let hasMore: boolean;

    if (feed === 'trending') {
      const data = await fetchTrendingAll(page);
      results = data.results;
      hasMore = page < data.totalPages;
    } else if (feed === 'popular') {
      if (sort === 'newest' || sort === 'oldest') {
        const data = await discoverPageStableDate([{ mediaType, filters }], sort, page);
        results = data.results;
        hasMore = data.hasMore;
      } else {
        const data = await discoverPage(mediaType, filters, sort, page);
        results = data.results;
        hasMore = page < data.totalPages;
      }
    } else {
      const animationFilters: DiscoverFilters = {
        ...filters,
        genreId: filters.genreId ? `${ANIMATION_GENRE_ID},${filters.genreId}` : String(ANIMATION_GENRE_ID),
      };
      if (sort === 'newest' || sort === 'oldest') {
        const data = await discoverPageStableDate(
          [
            { mediaType: 'movie', filters: animationFilters },
            { mediaType: 'tv', filters: animationFilters },
          ],
          sort,
          page
        );
        results = data.results;
        hasMore = data.hasMore;
      } else {
        const [movies, tv] = await Promise.all([
          discoverPage('movie', animationFilters, sort, page),
          discoverPage('tv', animationFilters, sort, page),
        ]);
        results = [...movies.results, ...tv.results];
        hasMore = page < Math.max(movies.totalPages, tv.totalPages);
      }
    }

    const mapped = results.map((item) => ({
      tmdbId: item.id,
      mediaType: item.media_type,
      title: item.title,
      originalTitle: item.original_title,
      posterUrl: item.poster_path ? `${TMDB_POSTER_BASE}${item.poster_path}` : null,
      releaseYear: item.release_date ? Number(item.release_date.slice(0, 4)) : null,
      tmdbRating: item.vote_average,
    }));

    return NextResponse.json({ results: await attachLibraryInfo(profile.id, mapped), hasMore });
  } catch (error) {
    console.error('TMDB feed error:', error);
    return NextResponse.json({ message: 'Ошибка запроса к TMDB' }, { status: 502 });
  }
}
