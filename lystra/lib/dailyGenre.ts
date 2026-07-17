import genres from '@/data/genres.json';

export function getGenreForDate(date: Date): string {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  return genres[seed % genres.length];
}
