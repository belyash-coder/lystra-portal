import Link from "next/link";
import StreamPlayer from "@/components/StreamPlayer";
import { createClient } from "@/lib/supabase/server";
import { Play } from "lucide-react";
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
  const supabase = await createClient();
  // Ждем параметры (в Next.js App Router лучше их резолвить, если версия выше 14)
  const params = await searchParams;
  const genre = params?.genre;

  // Достаем текущего юзера в самом начале, чтобы собрать его ленту
  const { data: { user } } = await supabase.auth.getUser();

  // 0. Получаем посты артистов по подписке
  let feedPosts: any[] = [];
  if (user) {
    const { data: follows } = await supabase
      .from('follow')
      .select('following_id')
      .eq('follower_id', user.id);

    const followingIds = follows?.map((f: any) => f.following_id) || [];

    if (followingIds.length > 0) {
      const { data: posts } = await supabase
        .from('artist_posts')
        .select(`*, artists(stage_name)`)
        .in('artist_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(10);
      
      feedPosts = posts || [];
    }
  }

  // 1. Мировые новинки из Deezer (с маппингом жанров)
  let globalReleases = [];
  try {
    const deezerGenreMap: Record<string, number> = {
      "Electronic": 106,
      "Rock": 152,
      "Hip-Hop": 116,
      "Pop": 132,
      "R&B": 165,
      "Jazz": 129,
      "Classical": 98,
      "Alternative": 85,
      "Metal": 464,
      "Indie": 85, // Deezer API группирует Indie с Alternative
      "Ambient": 106, // Fallback на Electronic для мировых чартов
      "Folk": 466
    };
    // Если жанр выбран и есть в нашей карте — используем его ID, иначе 0 (все жанры)
    const deezerId = genre && deezerGenreMap[genre] ? deezerGenreMap[genre] : 0;
    const deezerRes = await fetch(`https://api.deezer.com/editorial/${deezerId}/releases`);
    const deezerData = await deezerRes.json();
    globalReleases = deezerData.data?.slice(0, 8) || [];
  } catch (error) {
    console.error("Ошибка загрузки Deezer:", error);
  }

  // 2. Получаем последние ТРЕКИ вместе с релизами и артистами (с фильтрацией)
  let indieQuery = supabase
    .from("tracks")
    .select(`
      id,
      title,
      audio_path,
      duration,
      releases!inner (
        id,
        cover_path,
        genre,
        artists (
          stage_name
        )
      )
    `)
    .order("created_at", { ascending: false })
    .limit(genre ? 10 : 8); // Увеличили лимит до 8 для красивой сетки

  if (genre) {
    // Ищем частичное совпадение жанра (ilike нечувствителен к регистру)
    indieQuery = indieQuery.ilike('releases.genre', `%${genre}%`);
  }

  const { data: indieTracks } = await indieQuery;

  // 3. Глобальная лента отзывов (С именами, лайками и КОММЕНТАРИЯМИ)
  const { data: reviews, error: reviewsError } = await supabase
    .from("reviews")
    .select(`
      *,
      profiles!reviews_user_id_fkey (
        username
      ),
      likes (
        user_id
      ),
      comments (
        count
      )
    `)
    .order("created_at", { ascending: false })
    .limit(5);

  if (reviewsError) {
    console.error("❌ ОШИБКА СУПАБЕЙСА В ЛЕНТЕ:", reviewsError.message);
  }

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
              <Link 
                href="/add-indie" 
                className="inline-flex items-center justify-center w-full bg-[#a78bfa] hover:bg-[#906ffa] text-black font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-[#a78bfa]/10"
              >
                + Добавить релиз
              </Link>
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
                        <div className="relative aspect-square overflow-hidden rounded-lg mb-3">
                          <img src={album.cover_medium} alt={album.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                        </div>
                        <h3 className="font-semibold text-sm truncate">{album.title}</h3>
                        <p className="text-xs text-neutral-400 truncate">{album.artist.name}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              }
              indieSceneContent={
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-sm text-neutral-400">Пульс независимой сцены (Bandcamp & SoundCloud)</p>
                    <Link href="/releases" className="text-sm text-neutral-400 hover:text-white transition-colors">
                      Смотреть все →
                    </Link>
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
                        return (
                          <a 
                            key={track.id} 
                            href={linkHref} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="group cursor-pointer block"
                          >
                            <div className="relative aspect-square overflow-hidden rounded-lg mb-3 bg-neutral-800">
                              {coverUrl && <img src={coverUrl} alt={track.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />}
                            </div>
                            <h3 className="font-semibold text-sm text-white truncate">{track.title}</h3>
                            <p className="text-xs text-neutral-400 truncate">{artist?.stage_name || "Неизвестный артист"}</p>
                          </a>
                        );
                      }

                      return (
                        <Link 
                          href={`/release/${release?.id}`} 
                          key={track.id} 
                          className="group cursor-pointer block"
                        >
                          <div className="relative aspect-square overflow-hidden rounded-lg mb-3 bg-neutral-800">
                            {coverUrl && <img src={coverUrl} alt={track.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />}
                          </div>
                          <h3 className="font-semibold text-sm text-white truncate">{track.title}</h3>
                          <p className="text-xs text-neutral-400 truncate">{artist?.stage_name || "Неизвестный артист"}</p>
                        </Link>
                      );
                    })}
                  </div>

                  {!indieTracks?.length && (
                    <p className="text-neutral-500 text-sm mt-4">В радаре пока тихо...</p>
                  )}
                </section>
              }
            />

            {/* Персональная лента подписок */}
            {user && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-[#a78bfa]">Лента подписок</h2>
                </div>
                <div className="space-y-4">
                  {feedPosts.length > 0 ? (
                    feedPosts.map((post: any) => (
                      <div key={post.id} className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center flex-shrink-0 text-[#34d399] font-bold">
                            {post.artists?.stage_name?.charAt(0).toUpperCase() || 'A'}
                          </div>
                          <div>
                            <Link href={`/artist/${post.artist_id}`} className="font-bold text-white hover:text-[#34d399] transition-colors">
                              {post.artists?.stage_name || 'Неизвестный артист'}
                            </Link>
                            <p className="text-xs text-neutral-500">
                              {new Date(post.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        {/* Если текст поста лежит не в content, замени на актуальное название колонки */}
                        <p className="text-neutral-300 whitespace-pre-wrap text-sm leading-relaxed">
                          {post.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20">
                      <p className="text-neutral-500 text-sm">Здесь будут появляться новости артистов, на которых вы подписаны.</p>
                    </div>
                  )}
                </div>
              </section>
            )}

          </div>
        </div>
      </div>
      </div>
    </main>
  );
}