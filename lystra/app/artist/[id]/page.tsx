import BackButton from "@/components/BackButton";
import Image from "next/image";
import Link from "next/link";
import CustomAudioPlayer from "@/components/CustomAudioPlayer";
import DiscographySection from "@/components/DiscographySection"; // Импортируем новую секцию

// Интерфейсы для типизации Deezer API
interface ArtistInfo {
  id: number;
  name: string;
  picture_xl: string;
  nb_fan: number;
  error?: { message: string };
}

interface Track {
  id: number;
  title: string;
  preview: string;
}

interface RelatedArtist {
  id: number;
  name: string;
  picture_medium: string;
}

export const revalidate = 3600;

export default async function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const artistRes = await fetch(`https://api.deezer.com/artist/${id}`);
  if (!artistRes.ok) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center text-[#a78bfa]">
        <h2>Ошибка загрузки данных артиста</h2>
      </div>
    );
  }

  const artistInfo: ArtistInfo = await artistRes.json();

  if (artistInfo.error) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center text-red-400">
        <h2>Артист не найден в базе Deezer</h2>
      </div>
    );
  }

  // Увеличили лимит релизов до 100, чтобы вытянуть всю дискографию
  const [topTracksRes, albumsRes, relatedRes] = await Promise.all([
    fetch(`https://api.deezer.com/artist/${id}/top?limit=5`),
    fetch(`https://api.deezer.com/artist/${id}/albums?limit=100`), 
    fetch(`https://api.deezer.com/artist/${id}/related?limit=4`),
  ]);

  const [topTracksData, albumsData, relatedData] = await Promise.all([
    topTracksRes.json(),
    albumsRes.json(),
    relatedRes.json(),
  ]);

  const topTracks: Track[] = topTracksData.data || [];
  const allReleases = albumsData.data || [];
  const relatedArtists: RelatedArtist[] = relatedData.data || [];

  // Фильтруем релизы по типам (record_type отдает Deezer)
  const studioAlbums = allReleases.filter((a: any) => a.record_type === "album" || a.record_type === "compile");
  const singlesAndEps = allReleases.filter((a: any) => a.record_type === "single" || a.record_type === "ep");

  return (
    <main className="min-h-screen bg-[#121212] text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-12">
        <BackButton />
        {/* Херо-секция артиста */}
        <section className="relative h-[40vh] md:h-[50vh] rounded-2xl overflow-hidden flex items-end p-6 md:p-12 border border-neutral-800 group">
          
          {/* Фоновое изображение: на мобилках чуть темнее и более размыто, на десктопе - ярче и четче */}
          {/* Фоновое изображение: размытие сведено к минимуму (blur-md на мобилках, blur-sm на десктопе) */}
          <div className="absolute inset-0 z-0 opacity-50 md:opacity-70 blur-md md:blur-sm scale-105 transition-all duration-700 group-hover:scale-110 group-hover:opacity-60">
            <img src={artistInfo.picture_xl} alt="" className="w-full h-full object-cover" />
          </div>
          
          {/* Улучшенный градиент: мягче переход, чтобы верхняя часть картинки была чище */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/70 md:via-[#121212]/40 to-transparent z-10" />

          {/* Легкая лавандовая тонировка поверх фона для фирменного стиля LYSTRA */}
          <div className="absolute inset-0 bg-[#a78bfa]/5 mix-blend-overlay z-10" />

          <div className="relative z-20 flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left w-full">
            <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-[#121212] md:border-[#a78bfa] shadow-2xl shadow-[#a78bfa]/20 flex-shrink-0 z-30">
              <img src={artistInfo.picture_xl} alt={artistInfo.name} className="w-full h-full object-cover" />
            </div>
            
            <div className="flex-1 drop-shadow-md">
              <p className="text-xs uppercase tracking-widest text-[#34d399] font-bold mb-1 drop-shadow">
                Исполнитель
              </p>
              <h1 className="text-4xl md:text-7xl font-black mb-3 tracking-tight">
                {artistInfo.name}
              </h1>
              <p className="text-sm md:text-base text-neutral-300 font-medium">
                {Number(artistInfo.nb_fan).toLocaleString("ru-RU")} фанатов на Deezer
              </p>
            </div>
          </div>
        </section>

        {/* Сетка контента */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-12">
            
            {/* Популярные треки */}
<section className="bg-neutral-900/20 border border-neutral-800/60 p-6 rounded-2xl">
  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
    Популярные треки <span className="text-xs text-neutral-500 font-normal">(Превью)</span>
  </h2>
  <div className="space-y-2">
    {(() => {
      const trackQueue = topTracks
        .filter((t) => t.preview)
        .map((t) => ({
          id: t.id.toString(),
          title: t.title,
          url: t.preview,
          artist: artistInfo.name,
          artistId: artistInfo.id.toString(),
          coverUrl: (t as any).album?.cover_xl || (t as any).album?.cover_medium || artistInfo.picture_xl
        }));

      return topTracks.map((track, index) => (
          <div
            key={track.id}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-neutral-900/60 transition-colors group"
          >
            <div className="flex items-center gap-4 min-w-0">
              <span className="w-4 text-center text-xs text-neutral-500">{index + 1}</span>
              <p className="font-medium truncate text-sm group-hover:text-[#a78bfa] transition-colors">
                {track.title}
              </p>
            </div>
            <CustomAudioPlayer
              track={{
                id: track.id.toString(),
                title: track.title,
                url: track.preview,
                artist: artistInfo.name,
                artistId: artistInfo.id.toString(),
                coverUrl: (track as any).album?.cover_xl || (track as any).album?.cover_medium || artistInfo.picture_xl
              }}
              queue={trackQueue}
            />
          </div>
        ));
    })()}
  </div>
</section>

            {/* Выводим секции дискографии с помощью нового компонента */}
            <div>
              <DiscographySection title="Студийные альбомы" releases={studioAlbums} />
              <DiscographySection title="Синглы и EP" releases={singlesAndEps} />
              
              {allReleases.length === 0 && (
                <p className="text-neutral-500 text-sm italic">Релизы не найдены.</p>
              )}
            </div>

          </div>

          {/* Правая часть: Сайдбар (Похожие артисты) */}
          <div className="lg:col-span-1">
            <section className="bg-neutral-900/40 border border-neutral-800/80 p-6 rounded-2xl sticky top-24">
              <h2 className="text-xl font-bold mb-6">Похожие исполнители</h2>
              <div className="space-y-4">
                {relatedArtists.map((artist) => (
                  <Link 
                    href={`/artist/${artist.id}`} 
                    key={artist.id}
                    className="flex items-center gap-4 p-2 rounded-xl hover:bg-neutral-900/60 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-neutral-800">
                      <img src={artist.picture_medium} alt={artist.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm truncate group-hover:text-[#34d399] transition-colors">
                        {artist.name}
                      </h4>
                      <p className="text-[11px] text-neutral-500">Перейти в профиль</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

        </div>
      </div>
    </main>
  );
}