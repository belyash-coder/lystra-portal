import { NextResponse } from 'next/server';
import genres from '@/data/genres.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Берем копию базы, перемешиваем и отрезаем 30 штук
    const randomGenres = [...genres]
      .sort(() => 0.5 - Math.random())
      .slice(0, 30);
      
    return NextResponse.json(randomGenres);
  } catch (error) {
    console.error('Ошибка загрузки базы жанров:', error);
    return NextResponse.json(['Rock', 'Pop', 'Jazz', 'Electronic'], { status: 500 }); // Резервный пул
  }
}