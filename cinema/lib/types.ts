export type WatchStatus = 'PLANNED' | 'WATCHING' | 'WATCHED';

export interface MovieWithEntry {
  id: string;
  tmdbId: number;
  title: string;
  originalTitle: string | null;
  posterUrl: string | null;
  overview: string | null;
  releaseYear: number | null;
  runtime: number | null;
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

export interface MovieList {
  id: string;
  name: string;
  movieCount: number;
}

export const DISCOVER_LABELS: Record<string, string> = {
  popular: 'Популярное',
  now_playing: 'В прокате',
  top_rated: 'Топ рейтинг',
  upcoming: 'Скоро выйдет',
  trending: 'В тренде',
};

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
