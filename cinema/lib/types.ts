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
  watched: boolean;
  addedBy: { firstName: string | null; username: string | null };
}

export const ANIMATION_GENRE_NAME = 'Мультфильм';

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
