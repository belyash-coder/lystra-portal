import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import BackButton from '@/components/BackButton';

function pluralizeReleases(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'релиз';
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'релиза';
  return 'релизов';
}

export default async function IndieArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const artist = await prisma.artists.findUnique({
    where: { id },
    include: {
      releases: {
        orderBy: { created_at: 'desc' },
      },
    },
  });

  if (!artist) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#121212] text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <BackButton />

        <section>
          <span className="text-[#a78bfa] text-sm uppercase tracking-widest font-semibold">
            Независимая сцена
          </span>
          <h1 className="text-4xl md:text-6xl font-black mt-2 mb-2">{artist.stage_name}</h1>
          <p className="text-neutral-500 text-sm">
            {artist.releases.length} {pluralizeReleases(artist.releases.length)} на LYSTRA
          </p>
        </section>

        {artist.releases.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-8">
            {artist.releases.map((release) => {
              const coverUrl = release.cover_path?.startsWith('http')
                ? release.cover_path
                : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/release_covers/${release.cover_path}`;

              return (
                <Link key={release.id} href={`/release/${release.id}`} className="group block">
                  <div className="relative aspect-square overflow-hidden rounded-xl mb-4 bg-neutral-900 shadow-lg">
                    {release.cover_path ? (
                      <img
                        src={coverUrl}
                        alt={release.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs text-center p-4">
                        Обложка недоступна
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-base text-white truncate group-hover:text-[#a78bfa] transition-colors">
                    {release.title}
                  </h3>
                  {release.genre && (
                    <div className="mt-2">
                      <span className="inline-block text-xs border border-[#a78bfa]/30 text-neutral-400 px-2 py-0.5 rounded-md max-w-full truncate">
                        {release.genre}
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-neutral-500 text-sm text-center py-12 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/20">
            У этого артиста пока нет релизов.
          </p>
        )}
      </div>
    </main>
  );
}
