import { NextResponse } from 'next/server';
import genres from '@/data/genres.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const getGenreForDate = (date: Date) => {
      const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
      return genres[seed % genres.length];
    };

    const today = new Date();
    const currentGenre = getGenreForDate(today);

    // Генерируем историю: сначала вчерашний день, затем всё дальше в прошлое
    const history = [];
    for (let i = 1; i <= 7; i++) {
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - i);
      
      const day = pastDate.getDate().toString().padStart(2, '0');
      // Получаем короткое название месяца на русском
      const month = pastDate.toLocaleString('ru-RU', { month: 'short' }).replace('.', '');
      
      history.push({
        date: `${day} ${month}`,
        genre: getGenreForDate(pastDate)
      });
    }

    return NextResponse.json({ genre: currentGenre, history });
  } catch (error) {
    console.error('Ошибка получения жанра дня:', error);
    return NextResponse.json({ genre: 'Phonk', history: [] }, { status: 500 });
  }
}