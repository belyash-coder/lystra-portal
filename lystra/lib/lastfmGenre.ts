// Общая логика подбора треков по жанру/поджанру через Last.fm (богатый
// folksonomy-словарь тегов, ~6300 нишевых жанров в духе Every Noise at Once)
// с поиском превью в Deezer по артисту+названию. Используется и в
// spotify-mix (плейлист из 10 треков), и в genre-release (случайный релиз
// того же артиста) - вынесено сюда, чтобы не дублировать тонко настроенную
// нормализацию жанров в двух местах.

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;

export interface Candidate {
  name: string;
  artist: string;
}

export function candidateKey(c: Candidate): string {
  return `${c.artist.toLowerCase()}||${c.name.toLowerCase()}`;
}

// Многие жанры рулетки начинаются с национальности/региона ("Spanish
// Progressive Rock", "Irish Post-Punk", "UK Drum And Bass") — это ~22% списка.
// Просто брать последнее слово фразы теряет стилевые слова вроде "Progressive"
// или "Post", которые кардинально меняют суть жанра. Поэтому сначала пробуем
// снять только национальность/регион, сохранив всё остальное как есть.
const TWO_WORD_REGIONAL = ['south african', 'south korean', 'new zealand', 'hong kong', 'sri lankan', 'costa rican', 'puerto rican'];
const REGIONAL_MODIFIERS = new Set([
  'spanish', 'irish', 'british', 'uk', 'us', 'american', 'korean', 'japanese', 'chinese',
  'german', 'french', 'italian', 'canadian', 'australian', 'mexican', 'brazilian',
  'swedish', 'norwegian', 'danish', 'finnish', 'dutch', 'russian', 'indian', 'african',
  'latin', 'nordic', 'scandinavian', 'european', 'asian', 'scottish', 'welsh', 'english',
  'polish', 'portuguese', 'greek', 'turkish', 'egyptian', 'israeli', 'argentine', 'argentinian',
  'colombian', 'peruvian', 'chilean', 'cuban', 'jamaican', 'nigerian', 'indonesian', 'thai',
  'vietnamese', 'filipino', 'pinoy', 'pakistani', 'nz', 'icelandic', 'belgian', 'austrian',
  'swiss', 'czech', 'hungarian', 'romanian', 'ukrainian', 'croatian', 'serbian', 'latvian',
  'lithuanian', 'estonian', 'slovak', 'slovenian', 'bulgarian', 'bosnian', 'albanian',
  'macedonian', 'georgian', 'armenian', 'malaysian', 'singaporean', 'taiwanese', 'cambodian',
  'burmese', 'nepali', 'bangladeshi', 'kenyan', 'ghanaian', 'ethiopian', 'moroccan', 'algerian',
  'tunisian', 'lebanese', 'iranian', 'czsk', 'arab', 'texas',
]);

// Некоторые жанры оканчиваются на служебное слово, которое само по себе ничего
// не говорит о жанре ("Christmas Product", "Boy Band", "Video Game Music") —
// это внутренняя терминология каталога (условно "продукт для фона", "состав
// коллектива"), а не описание звучания. Брать его как тег бессмысленно —
// отрезаем его и берём то, что осталось.
const GENERIC_TRAILING_WORDS = new Set(['product', 'music', 'band']);

// Жанры вида "musica mexicana"/"musica mexiquense"/"canzone italiana"/"blues
// latinoamericano" называют национальность на языке этой страны, а не
// по-английски — как отдельный тег на Last.fm такое слово почти не
// встречается. Нормализуем к обычному англоязычному определению страны, под
// которым там реально много треков.
const DEMONYM_NORMALIZE: Record<string, string> = {
  mexicano: 'mexican',
  mexicana: 'mexican',
  mexiquense: 'mexican',
  brasileiro: 'brazilian',
  brasileira: 'brazilian',
  americana: 'american',
  espanol: 'spanish',
  espanola: 'spanish',
  chileno: 'chilean',
  chilena: 'chilean',
  argentino: 'argentinian',
  argentina: 'argentinian',
  francais: 'french',
  francaise: 'french',
  italiano: 'italian',
  italiana: 'italian',
  colombiano: 'colombian',
  colombiana: 'colombian',
  quebecois: 'canadian',
  catala: 'spanish',
  latinoamericano: 'latin',
  latinoamericana: 'latin',
};

// "Musica"/"musique"/"lagu" и т.п. — слово "музыка"/"песня" на другом языке в
// начале фразы ("musica mexicana", "musique quebecois"), само по себе оно
// ничего не говорит о жанре — вся суть в слове после него.
const GENERIC_LEADING_WORDS = new Set(['musica', 'musique', 'lagu', 'canzone', 'chanson', 'musik', 'muziek', 'nhac']);

// Список жанров рулетки — это ~6300 нишевых микро-жанров (в духе Every Noise at
// Once). Если ни национальности, ни служебного слова в фразе не было (например
// "Sad Sierreno") — откатываемся на главное (последнее) слово фразы как более
// широкий, но всё ещё жанрово точный запасной вариант.
export function getFallbackTag(genre: string): string | null {
  const trimmed = genre.trim();
  const lower = trimmed.toLowerCase();

  for (const phrase of TWO_WORD_REGIONAL) {
    if (lower.startsWith(phrase + ' ')) {
      const rest = trimmed.slice(phrase.length).trim();
      return rest || null;
    }
  }

  const words = trimmed.split(/\s+/);
  if (words.length <= 1) return null;

  const firstWord = words[0].toLowerCase();

  // "musica X" / "musique X" — само слово "музыка" ничего не значит, отрезаем
  // его; если то, что осталось — иноязычное обозначение страны, нормализуем.
  if (GENERIC_LEADING_WORDS.has(firstWord)) {
    const rest = words.slice(1);
    if (rest.length === 1 && DEMONYM_NORMALIZE[rest[0].toLowerCase()]) {
      return DEMONYM_NORMALIZE[rest[0].toLowerCase()];
    }
    return rest.join(' ') || null;
  }

  if (REGIONAL_MODIFIERS.has(firstWord)) {
    return words.slice(1).join(' ');
  }

  const lastWord = words[words.length - 1].toLowerCase();
  if (GENERIC_TRAILING_WORDS.has(lastWord)) {
    const rest = words.slice(0, -1).join(' ');
    return rest || null;
  }

  // Национальность в конце фразы ("Blues Latinoamericano", "Post-Punk
  // Latinoamericano") — отрезаем её и оставляем настоящий жанр перед ней,
  // а не наоборот.
  if (REGIONAL_MODIFIERS.has(lastWord) || DEMONYM_NORMALIZE[lastWord]) {
    const rest = words.slice(0, -1).join(' ');
    if (rest) return rest;
    return DEMONYM_NORMALIZE[lastWord] || lastWord;
  }

  return words[words.length - 1];
}

// У Deezer нет тегов для таких нишевых жанров, зато у Last.fm есть теги от
// самих пользователей (folksonomy) — они гораздо точнее совпадают именно с
// такими ярлыками. Last.fm не отдаёт превью для проигрывания, поэтому находим
// трек там (точный жанр), а само превью ищем по названию+артисту в Deezer.
export async function fetchLastfmCandidates(tag: string): Promise<Candidate[]> {
  if (!LASTFM_API_KEY) return [];
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=tag.gettoptracks&tag=${encodeURIComponent(tag)}&api_key=${LASTFM_API_KEY}&format=json&limit=50`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    let items = data?.tracks?.track;
    if (!items) return [];
    if (!Array.isArray(items)) items = [items]; // Last.fm отдаёт объект вместо массива при единственном результате

    return items
      .map((t: any) => ({ name: t?.name, artist: t?.artist?.name }))
      .filter((t: Candidate) => !!t.name && !!t.artist);
  } catch {
    return [];
  }
}

export async function findDeezerPreview(candidate: Candidate): Promise<any | null> {
  try {
    // Обычный текстовый поиск вместо строгого artist:"" track:"" — у Deezer и
    // Last.fm написание артиста/трека может немного отличаться (feat., ремастеры
    // и т.п.), из-за чего точное совпадение часто не находилось вообще.
    const q = `${candidate.artist} ${candidate.name}`;
    const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1`);
    if (!res.ok) return null;
    const data = await res.json();
    const track = data?.data?.[0];
    return track?.preview ? track : null;
  } catch {
    return null;
  }
}
