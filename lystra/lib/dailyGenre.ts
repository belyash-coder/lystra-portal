import genres from '@/data/genres.json';

export function getGenreForDate(date: Date): string {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  return genres[seed % genres.length];
}

// Некоторые жанры в genres.json написаны не Title Case-ом (например "czsk viral
// pop") — для отображения (картинка/текст уведомления) каждое слово с заглавной.
export function toTitleCase(text: string): string {
  return text.replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}
