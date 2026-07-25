export type WatchStatus = 'PLANNED' | 'WATCHING' | 'WATCHED';
export type MediaType = 'movie' | 'tv';

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  movie: 'Фильм',
  tv: 'Сериал',
};

export interface MovieWithEntry {
  id: string;
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  originalTitle: string | null;
  posterUrl: string | null;
  overview: string | null;
  releaseYear: number | null;
  runtime: number | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  tmdbRating: number | null;
  genres: string[];
  addedBy: { id: string; firstName: string | null; username: string | null };
  status: WatchStatus;
  rating: number | null;
}

export const STATUS_LABELS: Record<WatchStatus, string> = {
  PLANNED: 'Буду смотреть',
  WATCHING: 'Смотрю',
  WATCHED: 'Посмотрено',
};

export interface TmdbListItem {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  originalTitle: string | null;
  posterUrl: string | null;
  releaseYear: number | null;
  tmdbRating: number | null;
  libraryMovieId: string | null;
  inLibrary: boolean;
  imdbRating?: number | null;
  imdbVotes?: number | null;
  kpRating?: number | null;
  kpVotes?: number | null;
}

export type FeedName = 'trending' | 'popular' | 'animation';

export interface MovieList {
  id: string;
  name: string;
  movieCount: number;
}

export interface SharedListSummary {
  id: string;
  partner: { username: string | null; firstName: string | null } | null;
  movieCount: number;
}

export interface SharedListMovie {
  movieId: string;
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  posterUrl: string | null;
  releaseYear: number | null;
  genres: string[];
  genreIds: number[];
  watched: boolean;
  addedBy: { firstName: string | null; username: string | null };
}

// Id жанра "Анимация" в TMDB — совпадает для /genre/movie/list и /genre/tv/list.
const ANIMATION_GENRE_ID = 16;
// Локализация названия у TMDB не всегда одинакова между списком жанров фильмов
// и сериалов — держим оба варианта на случай, если у уже каталогизированного
// фильма нет сохранённого genreIds (старые записи до его появления).
const ANIMATION_GENRE_NAMES = ['Мультфильм', 'Анимация'];

export function isAnimationGenre(genreIds: number[], genres: string[]): boolean {
  if (genreIds.length > 0) return genreIds.includes(ANIMATION_GENRE_ID);
  return genres.some((g) => ANIMATION_GENRE_NAMES.includes(g));
}

export function sharedListPartnerLabel(partner: { username: string | null; firstName: string | null } | null): string {
  if (!partner) return 'Ожидание участника';
  return partner.username ? `@${partner.username}` : (partner.firstName ?? 'Без имени');
}

export const COUNTRIES = [
  { code: 'RU', name: 'Россия' },
  { code: 'US', name: 'США' },
  { code: 'GB', name: 'Великобритания' },
  { code: 'FR', name: 'Франция' },
  { code: 'DE', name: 'Германия' },
  { code: 'IT', name: 'Италия' },
  { code: 'ES', name: 'Испания' },
  { code: 'KR', name: 'Южная Корея' },
  { code: 'JP', name: 'Япония' },
  { code: 'CN', name: 'Китай' },
  { code: 'IN', name: 'Индия' },
  { code: 'CA', name: 'Канада' },
];
