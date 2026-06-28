import Link from "next/link";
import StreamPlayer from "@/components/StreamPlayer";
import { createClient } from "@/lib/supabase/server";
import { Play } from "lucide-react";
import CustomAudioPlayer from "@/components/CustomAudioPlayer";
import { LikeButton } from '@/components/LikeButton'
import { ReviewComments } from '@/components/ReviewComments'

export const revalidate = 0;

export default async function HomePage() {
  const supabase = await createClient();

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

  // 1. Мировые новинки из Deezer
  let globalReleases = [];
  try {
    const deezerRes = await fetch("https://api.deezer.com/editorial/0/releases");
    const deezerData = await deezerRes.json();
    globalReleases = deezerData.data?.slice(0, 4) || [];
  } catch (error) {
    console.error("Ошибка загрузки Deezer:", error);
  }

  // 2. Получаем последние ТРЕКИ вместе с релизами и артистами
  const { data: indieTracks } = await supabase
    .from("tracks")
    .select(`
      id,
      title,
      audio_path,
      duration,
      releases (
        id,
        cover_path,
        genre,
        artists (
          stage_name
        )
      )
    `)
    .order("created_at", { ascending: false })
    .limit(3);

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
    <main className="min-h-screen bg-[#121212] text-white p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-12">
        
        <section className="mt-8">
          <h1 className="text-5xl font-black mb-4">
            Открой для себя <span className="text-[#a78bfa]">новое</span>
          </h1>
          <p className="text-neutral-400 text-lg max-w-2xl">
            Симбиоз мировых чартов и независимой сцены. Слушай, оценивай, делись.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-12">
            
            {/* Мировые новинки */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Мировые новинки</h2>
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

            {/* Инди-радар */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#34d399]">Инди-радар</h2>
                <Link href="/releases" className="text-sm text-neutral-400 hover:text-white transition-colors">
                  Смотреть все →
                </Link>
              </div>
              <div className="space-y-4">
                {indieTracks?.map((track: any) => {
                  const release = track.releases;
                  const artist = release?.artists;
                  const coverUrl = getPublicUrl('release_covers', release?.cover_path);
                  const audioUrl = getPublicUrl('audio_files', track.audio_path);

                  return (
                    <div key={track.id} className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 flex flex-col gap-3">
                      <div className="flex items-center gap-4">
                        <Link href={`/release/${release?.id}`} className="w-12 h-12 rounded overflow-hidden bg-neutral-800 flex-shrink-0 hover:opacity-80 transition-opacity">
                          {coverUrl && <img src={coverUrl} alt="cover" className="w-full h-full object-cover" />}
                        </Link>
                        <div>
                          <Link href={`/release/${release?.id}`} className="hover:underline decoration-[#34d399] transition-all">
                            <h3 className="font-bold text-white">{track.title}</h3>
                          </Link>
                          <p className="text-sm text-[#a78bfa]">{artist?.stage_name || "Неизвестный артист"}</p>
                        </div>
                        <div className="ml-auto text-xs font-mono text-neutral-500">
                          {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                        </div>
                      </div>
                      
                      <CustomAudioPlayer 
                        src={audioUrl || ""} 
                        initialDuration={track?.duration || 0} 
                      />
                    </div>
                  );
                })}

                {!indieTracks?.length && (
                  <p className="text-neutral-500 text-sm">В радаре пока тихо...</p>
                )}
              </div>
            </section>

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

          {/* Лента активности */}
          <div className="lg:col-span-1">
            <section className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-6">Лента активности</h2>
              <div className="space-y-6">
                {reviews?.map((review: any) => (
                  <div key={review.id} className="border-b border-neutral-800 pb-4 last:border-0 last:pb-0 flex gap-4">
                    
                    {/* Обложка */}
                    {review.item_cover ? (
                      <img src={review.item_cover} alt="Обложка" className="w-12 h-12 rounded object-cover flex-shrink-0 bg-neutral-800" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-neutral-800 flex items-center justify-center text-[10px] text-neutral-500 flex-shrink-0">Н/Д</div>
                    )}
                    
                    <div className="flex-grow min-w-0">
                      
                      {/* МЯТНАЯ ССЫЛКА НА ПРОФИЛЬ */}
                      <div className="mb-2">
                        <Link 
                          href={`/profile/${review.user_id}`} 
                          className="text-sm font-bold text-[#34d399] hover:text-[#34d399]/80 transition-colors"
                        >
                          @{review.profiles?.username || 'user'}
                        </Link>
                      </div>

                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-white truncate">{review.item_title || "Неизвестный трек"}</h4>
                          <p className="text-xs text-[#a78bfa] truncate">{review.item_artist || "Неизвестный артист"}</p>
                        </div>
                        <div className="text-xs px-2 py-0.5 bg-neutral-800 border border-neutral-750 rounded text-neutral-300 flex-shrink-0 font-medium">
                          ★ {review.rating}
                        </div>
                      </div>
                      
                      {review.review_text && (
                        <p className="text-sm text-neutral-400 italic line-clamp-3 mt-2 bg-neutral-900/50 p-2.5 rounded-lg border border-neutral-800/60">
                          "{review.review_text}"
                        </p>
                      )}

                      {/* Интерактивный блок: Лайки и Комментарии */}
                      <div className="w-full mt-3">
                        <ReviewComments 
                          reviewId={review.id} 
                          initialCommentsCount={review.comments?.[0]?.count || 0} 
                        >
                          <LikeButton 
                            reviewId={review.id} 
                            initialIsLiked={review.likes?.some((like: any) => like.user_id === user?.id) || false} 
                            initialLikesCount={review.likes?.length || 0} 
                          />
                        </ReviewComments>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

        </div>
      </div>
    </main>
  );
}