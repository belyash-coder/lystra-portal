import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const TARGET_TRACK_COUNT = 10;

interface Candidate {
  name: string;
  artist: string;
}

function candidateKey(c: Candidate): string {
  return `${c.artist.toLowerCase()}||${c.name.toLowerCase()}`;
}

function dedupeById(tracks: any[], excludeIds: Set<string> = new Set()): any[] {
  const seen = new Set(excludeIds);
  return tracks.filter((t) => {
    const id = String(t.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
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

// Жанры вида "musica mexicana"/"musica mexiquense"/"canzone italiana" называют
// национальность на языке этой страны, а не по-английски — как отдельный тег
// на Last.fm такое слово почти не встречается. Нормализуем к обычному
// англоязычному определению страны, под которым там реально много треков.
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
};

// Список жанров рулетки — это ~6300 нишевых микро-жанров (в духе Every Noise at
// Once). Если ни национальности, ни служебного слова в фразе не было (например
// "Sad Sierreno") — откатываемся на главное (последнее) слово фразы как более
// широкий, но всё ещё жанрово точный запасной вариант.
function getFallbackTag(genre: string): string | null {
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

  if (REGIONAL_MODIFIERS.has(words[0].toLowerCase())) {
    return words.slice(1).join(' ');
  }

  const lastWord = words[words.length - 1].toLowerCase();
  if (GENERIC_TRAILING_WORDS.has(lastWord)) {
    const rest = words.slice(0, -1).join(' ');
    return rest || null;
  }

  if (DEMONYM_NORMALIZE[lastWord]) {
    return DEMONYM_NORMALIZE[lastWord];
  }

  return words[words.length - 1];
}

// У Deezer нет тегов для таких нишевых жанров, зато у Last.fm есть теги от
// самих пользователей (folksonomy) — они гораздо точнее совпадают именно с
// такими ярлыками. Last.fm не отдаёт превью для проигрывания, поэтому находим
// трек там (точный жанр), а само превью ищем по названию+артисту в Deezer.
async function fetchLastfmCandidates(tag: string): Promise<Candidate[]> {
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

async function findDeezerPreview(candidate: Candidate): Promise<any | null> {
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

async function resolveTracks(candidates: Candidate[], limit: number): Promise<any[]> {
  if (candidates.length === 0 || limit <= 0) return [];
  const shuffled = candidates.sort(() => Math.random() - 0.5).slice(0, 30);
  const resolved = await Promise.all(shuffled.map(findDeezerPreview));
  return resolved.filter((t): t is any => t !== null).slice(0, limit);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get('genre');

  if (!genre) return NextResponse.json({ error: 'Жанр не указан', tracks: [] }, { status: 400 });

  try {
    const triedKeys = new Set<string>();

    const exactCandidates = await fetchLastfmCandidates(genre);
    exactCandidates.forEach((c) => triedKeys.add(candidateKey(c)));

    const exactTracks = dedupeById(await resolveTracks(exactCandidates, TARGET_TRACK_COUNT));
    const exactIds = new Set(exactTracks.map((t) => String(t.id)));

    // По точной фразе жанра нашлось мало треков (или вообще ничего) — добираем
    // до нужного количества по более широкому, но всё ещё жанрово точному тегу
    // (главное слово фразы), не теряя уже найденное по точному жанру. Честно
    // сообщаем клиенту, сколько треков откуда, чтобы он мог показать это
    // пользователю, а не выдавать добор за точное совпадение.
    let fallbackTracks: any[] = [];
    let fallbackTag: string | null = null;

    if (exactTracks.length < TARGET_TRACK_COUNT) {
      fallbackTag = getFallbackTag(genre);
      if (fallbackTag) {
        const fallbackCandidates = (await fetchLastfmCandidates(fallbackTag)).filter(
          (c) => !triedKeys.has(candidateKey(c))
        );
        const extra = await resolveTracks(fallbackCandidates, TARGET_TRACK_COUNT - exactTracks.length);
        fallbackTracks = dedupeById(extra, exactIds);
      }
    }

    const allTracks = exactTracks.concat(fallbackTracks);

    if (allTracks.length === 0) {
      return NextResponse.json({ message: 'Треки для этого жанра не найдены', tracks: [] });
    }

    const finalTracks = allTracks.map((track: any) => ({
      id: String(track.id),
      title: track.title,
      artist: track.artist?.name || 'Неизвестный исполнитель',
      cover: track.album?.cover_xl || track.album?.cover_big || track.album?.cover || null,
      audio: track.preview,
    }));

    return NextResponse.json({
      playlist: genre,
      tracks: finalTracks,
      exactCount: exactTracks.length,
      fallbackTag: fallbackTracks.length > 0 ? fallbackTag : null,
    });
  } catch (error: any) {
    console.error('Ошибка при подборе треков:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера', tracks: [] }, { status: 500 });
  }
}
