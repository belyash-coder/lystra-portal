const LASTFM_API_KEY = process.env.LASTFM_API_KEY;

export interface Candidate {
  name: string;
  artist: string;
}

export interface DeezerTrack {
  id: number | string;
  title: string;
  preview?: string;
  artist?: { name?: string };
  album?: { cover_xl?: string; cover_big?: string; cover?: string };
}

export function candidateKey(c: Candidate): string {
  return `${c.artist.toLowerCase()}||${c.name.toLowerCase()}`;
}

export function dedupeById(tracks: DeezerTrack[], excludeIds: Set<string> = new Set()): DeezerTrack[] {
  const seen = new Set(excludeIds);
  return tracks.filter((t) => {
    const id = String(t.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

// У Deezer нет тегов для нишевых жанров, зато у Last.fm есть теги от самих
// пользователей (folksonomy) — они гораздо точнее совпадают с такими
// ярлыками. Last.fm не отдаёт превью для проигрывания, поэтому находим трек
// там (точный жанр), а само превью ищем по названию+артисту в Deezer.
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
      .map((t: { name?: string; artist?: { name?: string } }) => ({ name: t?.name, artist: t?.artist?.name }))
      .filter((t: Candidate) => !!t.name && !!t.artist);
  } catch {
    return [];
  }
}

export async function findDeezerPreview(candidate: Candidate): Promise<DeezerTrack | null> {
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

export async function resolveTracks(candidates: Candidate[], limit: number): Promise<DeezerTrack[]> {
  if (candidates.length === 0 || limit <= 0) return [];
  const shuffled = candidates.sort(() => Math.random() - 0.5).slice(0, 30);
  const resolved = await Promise.all(shuffled.map(findDeezerPreview));
  return resolved.filter((t): t is DeezerTrack => t !== null).slice(0, limit);
}
