import { ImageResponse } from 'next/og';
import { getGenreForDate } from '@/lib/dailyGenre';

export const dynamic = 'force-dynamic';

const BG = '#121212';
const LAVENDER = '#a78bfa';
const MINT = '#34d399';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get('genre') || getGenreForDate(new Date());

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `radial-gradient(circle at 50% 45%, #2a1f42 0%, ${BG} 65%)`,
          padding: 80,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: 6,
            color: MINT,
            textTransform: 'uppercase',
            marginBottom: 32,
          }}
        >
          Genre of the Day
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 84,
            fontWeight: 800,
            color: LAVENDER,
            textAlign: 'center',
            lineHeight: 1.15,
            maxWidth: 980,
          }}
        >
          {genre}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 4,
            color: '#8b8b8b',
            marginTop: 48,
          }}
        >
          LYSTRA
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
