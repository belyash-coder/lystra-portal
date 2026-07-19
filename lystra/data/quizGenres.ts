export interface QuizGenre {
  id: string;
  label: string;
  // Тег Last.fm, по которому подбираются треки для этого жанра.
  tag: string;
}

export interface QuizSection {
  id: 'ru' | 'foreign';
  label: string;
  genres: QuizGenre[];
}

export const QUIZ_SECTIONS: QuizSection[] = [
  {
    id: 'ru',
    label: 'Русское',
    genres: [
      { id: 'pop', label: 'Поп', tag: 'russian pop' },
      { id: 'rock', label: 'Рок', tag: 'russian rock' },
      { id: 'rap', label: 'Рэп', tag: 'russian hip hop' },
      { id: 'electronic', label: 'Электроника', tag: 'russian electronic' },
      { id: 'indie', label: 'Инди', tag: 'russian indie' },
      { id: 'chanson', label: 'Шансон', tag: 'russian chanson' },
      { id: 'punk', label: 'Панк', tag: 'russian punk' },
      { id: 'folk', label: 'Фолк / бардовская', tag: 'russian folk' },
    ],
  },
  {
    id: 'foreign',
    label: 'Зарубежное',
    genres: [
      { id: 'pop', label: 'Pop', tag: 'pop' },
      { id: 'rock', label: 'Rock', tag: 'rock' },
      { id: 'hiphop', label: 'Hip-Hop / Rap', tag: 'hip hop' },
      { id: 'electronic', label: 'Electronic', tag: 'electronic' },
      { id: 'rnb', label: 'R&B', tag: 'rnb' },
      { id: 'metal', label: 'Metal', tag: 'metal' },
      { id: 'jazz', label: 'Jazz', tag: 'jazz' },
      { id: 'latin', label: 'Latin', tag: 'latin' },
      { id: 'kpop', label: 'K-Pop', tag: 'kpop' },
      { id: 'country', label: 'Country', tag: 'country' },
    ],
  },
];

export function findQuizGenre(sectionId: string, genreId: string): { section: QuizSection; genre: QuizGenre } | null {
  const section = QUIZ_SECTIONS.find((s) => s.id === sectionId);
  if (!section) return null;
  const genre = section.genres.find((g) => g.id === genreId);
  if (!genre) return null;
  return { section, genre };
}
