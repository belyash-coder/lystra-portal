import { NextResponse } from 'next/server';
import genres from '@/data/genres.json'; // Путь к твоему файлу

// Словарь маппинга: Русский ввод -> Английский поиск
const ruToEnMap: Record<string, string> = {
  'рок': 'rock',
  'инди': 'indie',
  'поп': 'pop',
  'рэп': 'rap',
  'хип-хоп': 'hip hop',
  'хип хоп': 'hip hop',
  'джаз': 'jazz',
  'блюз': 'blues',
  'метал': 'metal',
  'электроника': 'electronic',
  'электронная': 'electronic',
  'танцевальная': 'dance',
  'классика': 'classical',
  'фолк': 'folk',
  'панк': 'punk',
  'альтернатива': 'alternative',
  'соул': 'soul',
  'кантри': 'country',
  'регги': 'reggae',
  'рнб': 'r&b',
  'rnb': 'r&b',
  'хаус': 'house',
  'техно': 'techno',
  'транс': 'trance',
  'дабстеп': 'dubstep',
  'эмбиент': 'ambient',
  'акустика': 'acoustic',
  'лоуфай': 'lo-fi',
  'lofi': 'lo-fi'
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase().trim() || '';

  if (!query) {
    return NextResponse.json([]);
  }

  // 1. Изначально мы ищем то, что ввел пользователь
  const searchTerms = [query];

  // 2. Умный поиск по словарю
  // Проходимся по словарю и смотрим, не начал ли пользователь вводить одно из русских слов
  for (const [ru, en] of Object.entries(ruToEnMap)) {
    // Если ввод совпадает с началом русского слова (например, "ин" -> "инди")
    // или русское слово целиком содержится в запросе
    if (ru.startsWith(query) || query.includes(ru)) {
      searchTerms.push(en); // Добавляем английский аналог в параметры поиска
    }
  }

  // 3. Фильтруем базу
  const filteredGenres = genres
    .filter((genre: string) => {
      const genreLower = genre.toLowerCase();
      // Оставляем жанр, если он содержит ХОТЯ БЫ ОДИН из наших поисковых терминов
      return searchTerms.some(term => genreLower.includes(term));
    })
    .slice(0, 10); // Отдаем только топ-10 совпадений

  return NextResponse.json(filteredGenres);
}