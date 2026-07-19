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
