import Link from "next/link";
import StreamPlayer from "@/components/StreamPlayer";
import { prisma } from "@/lib/prisma";
import { Play, ExternalLink } from "lucide-react";
import CustomAudioPlayer from "@/components/CustomAudioPlayer";
import { LikeButton } from '@/components/LikeButton'
import { ReviewComments } from '@/components/ReviewComments'
import HomeTabs from "@/components/HomeTabs";
import GenreSidebar from "@/components/GenreSidebar";

export const revalidate = 0;

export default async function HomePage({
  searchParams,
}: {
  searchParams: { genre?: string };
}) {
  const params = await searchParams;
  const genre = params?.genre;

  // 1. Мировые новинки из Deezer (с маппингом жанров)
  let globalReleases: any[] = [];
  try {
    // Deezer покрывает не все жанры из нашего фильтра — для непокрытых используем
    // "все жанры" (id 0) вместо угадывания несуществующего ID.
    const deezerGenreMap: Record<string, number> = {
      "Electronic": 106,
      "Rock": 152,
      "Metal": 464,
      "Alternative": 85,
      "Hip-Hop/Rap": 116,
      "Folk": 466,
      "Pop": 132,
      "Ambient": 106,
      "Jazz": 129,
      "R&B/Soul": 165,
      "Classical": 98,
    };
    const deezerId = genre && deezerGenreMap[genre] ? deezerGenreMap[genre] : 0;
    const deezerRes = await fetch(`https://api.deezer.com/editorial/${deezerId}/releases`);
    const deezerData = await deezerRes.json();
    const rawReleases = deezerData.data?.slice(0, 8) || [];

    globalReleases = await Promise.all(
      rawReleases.map(async (album: any) => {
        try {
          const detailRes = await fetch(`https://api.deezer.com/album/${album.id}`);
          const detailData = await detailRes.json();
          const fetchedGenre = detailData.genres?.data?.[0]?.name;
          return { ...album, genre: fetchedGenre };
        } catch (e) {
          return album;
        }
      })
    );
  } catch (error) {
    console.error("Ошибка загрузки Deezer:", error);
  }

  // 2. Последние треки независимой сцены (с фильтрацией по жанру)
  const indieTracks = await prisma.tracks.findMany({
    where: genre ? { releases: { genre: { contains: genre, mode: 'insensitive' } } } : undefined,
    orderBy: { created_at: 'desc' },
    take: genre ? 10 : 8,
    include: {
      releases: {
        include: { artists: true },
      },
    },
  });

  // 3. Глобальная лента отзывов через Prisma
  const reviews = await prisma.reviews.findMany({
    orderBy: { created_at: 'desc' },
    take: 5,
    include: {
      profiles: { select: { username: true } }
    }
  });

  const getPublicUrl = (bucket: string, path: string) => {
    if (!path) return '';
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
  };

  return (
    <main className="min-h-screen bg-[#121212] text-white px-6 md:px-12 py-8 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-12">
        
        {/* Заголовок страницы по центру */}
        <div className="max-w-2xl mx-auto text-center mt-8 mb-12">
          <h1 className="text-5xl font-black mb-4">
            Открой для себя <span className="text-[#a78bfa]">новое</span>
          </h1>
          <p className="text-neutral-400 text-lg">
            Симбиоз мировых чартов и независимой сцены. Слушай, оценивай, делись.
          </p>
        </div>

        <div className="w-full flex flex-col md:flex-row gap-8 lg:gap-20 xl:gap-24 mb-16">
          
          {/* Левая колонка: Сайдбар */}
          <div className="w-full md:w-[250px] lg:w-[280px] flex-shrink-0">
            <div className="sticky top-24 z-40 space-y-8">
              {/* Передаем basePath="/", чтобы фильтры работали для главной страницы */}
              <GenreSidebar currentGenre={genre} basePath="/" />
            </div>
          </div>

          {/* Правая колонка: Вкладки с контентом */}
          <div className="flex-grow min-w-0">
          
          <div className="space-y-12">
            
            <HomeTabs 
              globalReleasesContent={
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-sm text-neutral-400">Свежие релизы со всего мира</p>
                    <Link href="/global-releases" className="text-sm text-neutral-400 hover:text-white transition-colors">
                      Смотреть все →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {globalReleases.map((album: any) => (
                      <Link href={`/album/${album.id}`} key={album.id} className="group cursor-pointer block">
                        <div className="relative aspect-square overflow-hidden rounded-lg mb-3 bg-neutral-800">
                          <img src={album.cover_medium} alt={album.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                            <div className="w-12 h-12 rounded-full bg-[#a78bfa]/90 flex items-center justify-center text-black">
                              <Play className="w-6 h-6 ml-1" fill="currentColor" />
                            </div>
                          </div>
                        </div>
                        <h3 className="font-semibold text-sm text-white truncate group-hover:text-[#a78bfa] transition-colors">{album.title}</h3>
                        <p className="text-xs text-neutral-400 truncate">{album.artist.name}</p>
                        {(album.genre || genre || "Новинка") && (
                          <div className="mt-1.5">
                            <span className="inline-block text-[10px] border border-[#a78bfa]/30 text-neutral-400 px-2 py-0.5 rounded-md max-w-full truncate">
                              {album.genre || genre || "Новинка"}
                            </span>
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              }
              indieSceneContent={
                <section>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <p className="text-sm text-neutral-400">
                      Пульс независимой сцены <span className="hidden sm:inline">(Bandcamp & SoundCloud)</span>
                    </p>
                    <div className="flex items-center gap-4 justify-between sm:justify-end flex-shrink-0">
                      <Link 
                        href="/add-indie" 
                        className="inline-flex items-center justify-center bg-[#a78bfa] hover:bg-[#906ffa] text-black font-bold py-2 px-4 rounded-xl text-xs transition-all shadow-lg shadow-[#a78bfa]/10"
                      >
                        + Добавить релиз
                      </Link>
                      <Link href="/releases" className="text-sm text-neutral-400 hover:text-white transition-colors whitespace-nowrap">
                        Смотреть все →
                      </Link>
                    </div>
                  </div>
                  
                  {/* Новая квадратная сетка карточек */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {indieTracks?.map((track: any) => {
                      const release = track.releases;
                      const artist = release?.artists;
                      
                      // Обрабатываем ссылки на обложки
                      const isExternalCover = release?.cover_path?.startsWith('http') || release?.cover_path?.startsWith('//');
                      const coverUrl = isExternalCover 
                        ? (release.cover_path.startsWith('//') ? `https:${release.cover_path}` : release.cover_path)
                        : getPublicUrl('release_covers', release?.cover_path);

                      // Проверяем, является ли аудио внешним источником
                      const isExternalLink = track.audio_path?.startsWith('http') || track.audio_path?.startsWith('bandcamp:');

                      if (isExternalLink) {
                            const linkHref = track.audio_path?.startsWith('http') ? track.audio_path : '#';
                            
                            let platformName = "источнике";
                            if (track.audio_path?.includes('soundcloud.com')) {
                              platformName = "SoundCloud";
                            } else if (track.audio_path?.includes('bandcamp.com') || track.audio_path?.startsWith('bandcamp:')) {
                              platformName = "Bandcamp";
                            }

                            return (
                              <div 
                                key={track.id} 
                                tabIndex={0}
                                className="group block outline-none"
                              >
                                <div className="relative aspect-square overflow-hidden rounded-lg mb-3 bg-neutral-800 cursor-pointer">
                                  {coverUrl && <img src={coverUrl} alt={track.title} className="object-cover w-full h-full group-hover:scale-105 group-focus:scale-105 transition-transform duration-300" />}
                                  
                                  <a 
                                    href={linkHref} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="absolute inset-0 bg-black/50 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus:opacity-100 group-focus:pointer-events-auto transition-opacity duration-300 flex flex-col items-center justify-center gap-2 backdrop-blur-sm"
                                  >
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#34d399]/90 flex items-center justify-center text-black shadow-lg flex-shrink-0">
                                      <ExternalLink className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </div>
                                    <span className="text-white text-[10px] sm:text-xs font-medium text-center leading-tight px-1">
                                      Слушать на<br/>
                                      <span className="font-bold text-[#34d399]">{platformName}</span>
                                    </span>
                                  </a>
                                </div>
                                <a href={linkHref} target="_blank" rel="noopener noreferrer" className="block focus:outline-none">
                                  <h3 className="font-semibold text-sm text-white truncate group-hover:text-[#34d399] group-focus:text-[#34d399] transition-colors">{track.title}</h3>
                                </a>
                                <p className="text-xs text-neutral-400 truncate">{artist?.stage_name || "Неизвестный артист"}</p>
                                {release?.genre && (
                                  <div className="mt-1.5">
                                    <span className="inline-block text-[10px] border border-[#a78bfa]/30 text-neutral-400 px-2 py-0.5 rounded-md max-w-full truncate">
                                      {release.genre}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          }

                      return (
                        <div 
                          key={track.id} 
                          tabIndex={0}
                          className="group block outline-none"
                        >
                          <div className="relative aspect-square overflow-hidden rounded-lg mb-3 bg-neutral-800 cursor-pointer">
                            {coverUrl && <img src={coverUrl} alt={track.title} className="object-cover w-full h-full group-hover:scale-105 group-focus:scale-105 transition-transform duration-300" />}
                            <Link 
                              href={`/release/${release?.id}`}
                              className="absolute inset-0 bg-black/40 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus:opacity-100 group-focus:pointer-events-auto transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]"
                            >
                              <div className="w-12 h-12 rounded-full bg-[#a78bfa]/90 flex items-center justify-center text-black">
                                <Play className="w-6 h-6 ml-1" fill="currentColor" />
                              </div>
                            </Link>
                          </div>
                          <Link href={`/release/${release?.id}`} className="block focus:outline-none">
                            <h3 className="font-semibold text-sm text-white truncate group-hover:text-[#a78bfa] group-focus:text-[#a78bfa] transition-colors">{track.title}</h3>
                          </Link>
                          <p className="text-xs text-neutral-400 truncate">{artist?.stage_name || "Неизвестный артист"}</p>
                          {release?.genre && (
                            <div className="mt-1.5">
                              <span className="inline-block text-[10px] border border-[#a78bfa]/30 text-neutral-400 px-2 py-0.5 rounded-md max-w-full truncate">
                                {release.genre}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!indieTracks?.length && (
                    <p className="text-neutral-500 text-sm mt-4">В радаре пока тихо...</p>
                  )}
                </section>
              }
            />

          </div>
        </div>
      </div>
      </div>
    </main>
  );
}