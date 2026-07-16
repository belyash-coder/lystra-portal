// Список жанров рулетки (data/genres.json в мобильном приложении и TMA) — это ~6300
// нишевых микро-жанров (в духе Every Noise at Once), для которых у Deezer нет
// собственной категории. Точного 1-в-1 соответствия не существует, поэтому вместо
// текстового поиска (который может подсунуть вообще не в тему трек) классифицируем
// жанр по ключевым словам в одну из проверенных широких категорий Deezer и берём
// треки из её настоящего чарта — гарантированно то, что Deezer сам считает этим
// жанром. Если не удалось уверенно классифицировать — лучше честно ничего не найти,
// чем показать случайный мимо-жанровый трек.

// ID подтверждены против реального /genre эндпоинта Deezer (см. app/page.tsx).
const DEEZER_GENRE_IDS = {
  rock: 152,
  metal: 464,
  electronic: 106,
  hiphop: 116,
  rnb: 165,
  latin: 197,
  reggae: 144,
  blues: 153,
  folk: 466,
  funk: 169,
  soundtrack: 173,
  alternative: 85,
  jazz: 129,
  classical: 98,
  pop: 132,
} as const;

type Category = keyof typeof DEEZER_GENRE_IDS;

// Порядок важен: более специфичные категории проверяются раньше общих
// (например "metal" раньше "rock").
const CLASSIFIER: [string[], Category][] = [
  [['metal'], 'metal'],
  [
    ['punk', 'grunge', 'wave', 'stoner', 'emo', 'hardcore', 'shoegaze', 'britpop', 'merseybeat', 'british invasion'],
    'rock',
  ],
  [
    [
      'house', 'techno', 'trance', 'dnb', 'drum and bass', 'dubstep', 'electro', 'edm',
      'big room', 'synth', 'idm', 'breakbeat', 'jungle', 'garage', 'phonk', 'brostep',
    ],
    'electronic',
  ],
  [['hip hop', 'rap', 'trap', 'drill', 'grime', 'plugg'], 'hiphop'],
  [['r&b', 'soul', 'urban contemporary', 'motown', 'quiet storm'], 'rnb'],
  [
    [
      'musica mexicana', 'corrido', 'norteno', 'sierreno', 'banda', 'ranchera', 'grupera',
      'agronejo', 'sertanejo', 'mpb', 'pagode', 'arrocha', 'latin', 'reggaeton', 'urbano',
      'salsa', 'cumbia', 'bachata', 'tropical', 'flamenco', 'mariachi', 'bolero',
    ],
    'latin',
  ],
  [['reggae', 'dancehall', 'ska'], 'reggae'],
  [['blues'], 'blues'],
  [['folk', 'acoustic', 'singer-songwriter', 'chanson', 'cantautor'], 'folk'],
  [['funk', 'disco'], 'funk'],
  [['soundtrack', 'score', 'filmi', 'bollywood', 'anime', 'movie tunes'], 'soundtrack'],
  [['indie', 'alternative', 'alt z', 'ambient', 'chill', 'lo-fi'], 'alternative'],
  [['jazz'], 'jazz'],
  [['classical', 'opera', 'orchestral', 'instrumental'], 'classical'],
  [['pop', 'k-pop', 'j-pop', 'opm', 'boy band'], 'pop'],
];

export function classifyGenreToDeezerId(genre: string): number | null {
  const low = genre.toLowerCase();
  for (const [keywords, category] of CLASSIFIER) {
    if (keywords.some((k) => low.includes(k))) return DEEZER_GENRE_IDS[category];
  }
  return null;
}
