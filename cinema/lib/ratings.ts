export interface ExternalRating {
  rating: number | null;
  votes: number | null;
}

const MIN_IMDB_VOTES = 1000;
const MIN_KP_VOTES = 500;

export async function getOmdbRating(imdbId: string): Promise<ExternalRating> {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) return { rating: null, votes: null };

  try {
    const url = new URL('https://www.omdbapi.com/');
    url.searchParams.set('i', imdbId);
    url.searchParams.set('apikey', apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) return { rating: null, votes: null };
    const data = await res.json();

    const rating = data.imdbRating && data.imdbRating !== 'N/A' ? Number(data.imdbRating) : null;
    const votes = data.imdbVotes && data.imdbVotes !== 'N/A' ? Number(data.imdbVotes.replace(/,/g, '')) : null;

    return { rating: Number.isFinite(rating) ? rating : null, votes: Number.isFinite(votes) ? votes : null };
  } catch {
    return { rating: null, votes: null };
  }
}

export async function getKinopoiskRating(imdbId: string): Promise<ExternalRating> {
  const apiKey = process.env.KINOPOISK_API_KEY;
  if (!apiKey) return { rating: null, votes: null };

  try {
    const url = new URL('https://api.kinopoisk.dev/v1.4/movie');
    url.searchParams.set('externalId.imdb', imdbId);
    url.searchParams.set('limit', '1');

    const res = await fetch(url.toString(), { headers: { 'X-API-KEY': apiKey } });
    if (!res.ok) return { rating: null, votes: null };
    const data = await res.json();
    const movie = data.docs?.[0];
    if (!movie) return { rating: null, votes: null };

    const rating = typeof movie.rating?.kp === 'number' ? movie.rating.kp : null;
    const votes = typeof movie.votes?.kp === 'number' ? movie.votes.kp : null;

    return { rating, votes };
  } catch {
    return { rating: null, votes: null };
  }
}

export function passesRatingThreshold(
  minRating: number,
  imdb: ExternalRating,
  kp: ExternalRating
): boolean {
  const imdbOk = imdb.rating != null && imdb.votes != null && imdb.votes >= MIN_IMDB_VOTES && imdb.rating >= minRating;
  const kpOk = kp.rating != null && kp.votes != null && kp.votes >= MIN_KP_VOTES && kp.rating >= minRating;
  return imdbOk || kpOk;
}
