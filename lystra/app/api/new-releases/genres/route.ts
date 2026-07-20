import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('https://api.deezer.com/genre');
    if (!res.ok) throw new Error('Ошибка Deezer API');

    const data = await res.json();
    const genres = (data?.data || [])
      // id 0 — служебная категория Deezer "All", у нас для неё уже есть свой
      // фильтр "Все" в интерфейсе, дублировать не нужно.
      .filter((g: any) => g.id !== 0)
      .map((g: any) => ({ id: String(g.id), name: g.name }));

    return NextResponse.json(genres, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Ошибка получения жанров новых релизов:', error);
    return NextResponse.json({ error: 'Не удалось получить список жанров' }, { status: 500 });
  }
}
