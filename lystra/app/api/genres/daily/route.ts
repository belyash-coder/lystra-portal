import { NextResponse } from 'next/server';
import { getGenreForDate } from '@/lib/dailyGenre';

export const dynamic = 'force-dynamic';

// Intl/toLocaleString('ru-RU', { month: 'short' }) отдаёт именительный падеж
// ("июль"), а не родительный ("09 июля") — используем явную склонённую форму.
const MONTHS_GENITIVE_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export async function GET() {
  try {
    const today = new Date();
    const currentGenre = getGenreForDate(today);

    // Генерируем историю: сначала вчерашний день, затем всё дальше в прошлое
    const history = [];
    for (let i = 1; i <= 7; i++) {
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - i);
      
      const day = pastDate.getDate().toString().padStart(2, '0');
      const month = MONTHS_GENITIVE_RU[pastDate.getMonth()];

      history.push({
        date: `${day} ${month}`,
        genre: getGenreForDate(pastDate)
      });
    }

    return NextResponse.json(
      { genre: currentGenre, history },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('Ошибка получения жанра дня:', error);
    return NextResponse.json({ genre: 'Phonk', history: [] }, { status: 500 });
  }
}