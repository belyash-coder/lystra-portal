import BackButton from "@/components/BackButton";
import Image from "next/image";
import Link from "next/link";
import AlbumTrackList from "@/components/AlbumTrackList";
import CollapsibleSection from "@/components/CollapsibleSection";
import { AddToCollectionButton } from "@/components/AddToCollectionButton";
import { ReviewForm } from "@/components/ReviewForm";
import { createClient } from "@/lib/supabase/server";
import { ReviewActions } from "@/components/ReviewActions";

// Базовые интерфейсы для типизации ответа Deezer
interface Track {
  id: number;
  title: string;
  duration: number;
  preview: string;
}

interface Album {
  id: number;
  title: string;
  cover_xl: string;
  release_date: string;
  artist: {
    id: number;
    name: string;
  };
  tracks: {
    data: Track[];
  };
  error?: {
    message: string;
  };
}

export const revalidate = 0;

// Изменилась типизация params: теперь это Promise
export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  // Распаковываем Promise
  const resolvedParams = await params;
  const { id } = resolvedParams;

  // 1. Выполняем серверный запрос к Deezer
  const res = await fetch(`https://api.deezer.com/album/${id}`, {
    next: { revalidate: 3600 }
  });

  if (!res.ok) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center text-[#a78bfa]">
        <h2>Ошибка сети. Альбом не найден</h2>
      </div>
    );
  }

  const album: Album = await res.json();

  // Deezer может вернуть статус 200, но внутри написать ошибку (например, неверный ID)
  if (album.error || !album.artist) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center text-red-400">
        <h2>Ошибка Deezer: Альбом не найден или удален</h2>
      </div>
    );
  }

  // 2. Работа с Supabase: проверка коллекции и загрузка отзывов
  let isAddedToCollection = false;
  let albumReviews: any[] = [];
  let titlesMap: Record<string, string> = {};
  let currentUser: any = null; // Выносим пользователя в общую зону видимости
  
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user; // Сохраняем данные авторизации
    
    if (user) {
      const { data: collectionData } = await supabase
        .from('collections')
        .select('id')
        .match({ user_id: user.id, item_id: id, item_type: 'album' })
        .maybeSingle();

      if (collectionData) isAddedToCollection = true;
    }

    // Загружаем отзывы (тянем статистику и active_title_id)
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('reviews')
      .select('*, profiles!user_id(username, avatar_url, active_title_id, user_stats(releases_count, reviews_count, comments_count)), review_likes(user_id), review_comments(id, content, created_at, user_id, parent_id, profiles!user_id(username, avatar_url))')
      .eq('item_id', id)
      .eq('item_type', 'album')
      .order('created_at', { ascending: false });

    if (reviewsError) {
      console.error("Ошибка получения отзывов из Supabase:", reviewsError);
    }

    if (reviewsData) {
      albumReviews = reviewsData;
      
      // Безопасно собираем уникальные ID званий с учетом строгой типизации
      const titleIds = albumReviews
        .map(r => {
          const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
          return p?.active_title_id;
        })
        .filter(Boolean) as string[];

      const uniqueTitleIds = Array.from(new Set(titleIds));

      if (uniqueTitleIds.length > 0) {
        const { data: titlesData } = await supabase.from('achievements').select('id, name').in('id', uniqueTitleIds);
        if (titlesData) {
          titlesData.forEach(t => {
            titlesMap[t.id] = t.name;
          });
        }
      }
    }
    
  } catch (error) {
    console.error("Ошибка подключения к Supabase:", error);
  }

  // 3. Запрашиваем дополнительные данные для сайдбара
  let artistAlbums = [];
  let relatedArtists = [];
  try {
    // Делаем параллельные запросы для ускорения загрузки
    const [albumsRes, relatedRes] = await Promise.all([
      fetch(`https://api.deezer.com/artist/${album.artist.id}/albums?limit=6`, { next: { revalidate: 3600 } }),
      fetch(`https://api.deezer.com/artist/${album.artist.id}/related?limit=5`, { next: { revalidate: 3600 } })
    ]);
    
    const albumsData = await albumsRes.json();
    const relatedData = await relatedRes.json();
    
    // Исключаем текущий альбом из списка "других релизов"
    artistAlbums = albumsData.data?.filter((a: any) => a.id !== Number(id)).slice(0, 4) || [];
    relatedArtists = relatedData.data?.slice(0, 5) || [];
  } catch (error) {
    console.error("Ошибка загрузки сайдбара:", error);
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 md:p-12">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-8 flex flex-col gap-4 items-start">
          <Link 
            href="/global-releases" 
            className="text-[#a78bfa] hover:text-white transition-all text-sm font-bold flex items-center gap-2 bg-[#a78bfa]/10 hover:bg-[#a78bfa]/20 px-4 py-2 rounded-xl border border-[#a78bfa]/20 shadow-lg w-fit"
          >
            ← К списку релизов
          </Link>
          <BackButton />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-16">
          
          {/* Левая колонка (Основной контент) */}
          <div className="lg:col-span-2">
            
            {/* Шапка альбома */}
      <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-end mb-12">
        <Image
          src={album.cover_xl}
          alt={album.title}
          width={260}
          height={260}
          className="rounded-2xl shadow-2xl shadow-[#a78bfa]/20 flex-shrink-0"
          unoptimized
          priority
        />
        <div className="text-center md:text-left flex flex-col items-center md:items-start w-full min-w-0">
          <p className="text-sm text-gray-400 uppercase tracking-widest mb-2 font-bold">Альбом</p>
          <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight line-clamp-2 w-full pb-1" title={album.title}>
            {album.title}
          </h1>
          <div className="flex items-center justify-center md:justify-start gap-2 text-lg mb-6">
            <Link href={`/artist/${album.artist.id}`} className="text-[#34d399] hover:underline">
              {album.artist.name}
            </Link>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400">{album.release_date?.substring(0, 4)}</span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
            {/* Кнопка добавления в коллекцию */}
            <AddToCollectionButton 
              itemId={id} 
              itemType="album" 
              initialAdded={isAddedToCollection} 
            />
            
            {/* Якорная ссылка к рецензиям (Скрыта на мобильных) */}
            <a 
              href="#reviews"
              className="hidden md:flex items-center justify-center px-6 py-2.5 rounded-full border border-neutral-700 bg-neutral-900/50 font-bold text-neutral-400 hover:text-white hover:border-[#34d399] transition-all"
            >
              К рецензиям ↓
            </a>
          </div>
        </div>
      </div>

      {/* Список треков с плеером */}
          <AlbumTrackList tracks={album.tracks?.data || []} />

      {/* Форма написания рецензии и список отзывов */}
          <div className="w-full scroll-mt-32" id="reviews">
            <CollapsibleSection title={`Рецензии (${albumReviews.length})`}>
              {/* Форма для нового отзыва */}
              <div className="mb-10">
                <ReviewForm 
                  itemId={id} 
                  itemType="album" 
                  itemTitle={album.title} 
                  itemArtist={album.artist.name} 
                  itemCover={album.cover_xl} 
                />
              </div>

              {/* Список существующих отзывов */}
              <div className="space-y-4">
                {albumReviews.length === 0 ? (
                  <div className="bg-white/5 border border-white/5 border-dashed p-8 rounded-2xl text-center">
                    <p className="text-gray-500">Пока никто не оставил рецензию. Будьте первыми!</p>
                  </div>
                ) : (
                  albumReviews.map((review) => {
                    const profileObj = Array.isArray(review.profiles) ? review.profiles[0] : review.profiles;
                    const stats = profileObj?.user_stats;
                    const statsObj = Array.isArray(stats) ? stats[0] : stats;
                    const points = (statsObj?.releases_count || 0) + (statsObj?.reviews_count || 0) + (statsObj?.comments_count || 0);

                    // Рамки (полностью перенесены из профиля, но чуть адаптированы под маленький размер аватара)
                    let frameClass = "border-2 border-transparent group-hover:border-[#a78bfa]/50"; 
                    if (points >= 300) {
                      frameClass = "p-1 bg-gradient-to-tr from-[#a78bfa] via-[#34d399] to-[#a78bfa] shadow-[0_0_0_2px_#121212,0_0_0_4px_#a78bfa]";
                    } else if (points >= 100) {
                      frameClass = "border-[3px] border-[#34d399] shadow-[0_0_10px_rgba(52,211,153,0.3)]";
          0.5       } else if (points >= 28) {
                      frameClass = "border-2 border-[#a78bfa] ring-2 ring-[#121212] ring-offset-1 ring-offset-[#a78bfa]";
                    }

                    // Звание берем из таблицы achievements строго по ключу
                    const titleId = profileObj?.active_title_id;
                    const titleName = typeof titleId === 'string' ? titlesMap[titleId] : null;

                    // Считаем реальные лайки и комментарии из привязанных таблиц
                    const likesCount = Array.isArray(review.review_likes) ? review.review_likes.length : 0;
                    const commentsCount = Array.isArray(review.review_comments) ? review.review_comments.length : 0;
                    const hasLiked = Array.isArray(review.review_likes) ? review.review_likes.some((l: any) => l.user_id === currentUser?.id) : false;

                    return (
                      <div key={review.id} className="bg-gradient-to-br from-white/5 to-transparent p-4 md:p-5 rounded-2xl border border-white/10 transition-all duration-300 flex flex-col gap-3 relative backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                          <Link href={`/profile/${profileObj?.username || review.user_id}`} className="flex items-center gap-3 group">
                            <div className={`w-10 h-10 md:w-12 md:h-12 relative rounded-full flex-shrink-0 transition-all z-10 ${frameClass}`}>
                              {points >= 300 && (
                                <div className="absolute -inset-1 bg-gradient-to-tr from-[#a78bfa] to-[#34d399] rounded-full blur-sm opacity-50 animate-pulse -z-10"></div>
                              )}
                              <div className="w-full h-full relative rounded-full overflow-hidden bg-neutral-800">
                                {profileObj?.avatar_url ? (
                                  <Image src={profileObj.avatar_url} alt="avatar" fill className="object-cover" unoptimized />
                                ) : (
                                  <span className="flex items-center justify-center w-full h-full text-sm font-bold text-[#a78bfa] bg-[#121212]">
                                    {(profileObj?.username || 'U')[0].toUpperCase()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm md:text-base font-bold text-white group-hover:text-[#a78bfa] transition-colors">
                                @{review.profiles?.username || 'Пользователь'}
                              </p>
                              {titleName && (
                                <div className="my-0.5">
                                  <span className="px-2 py-0.5 bg-[#34d399] text-[#121212] text-[9px] md:text-[10px] rounded-full font-bold inline-block shadow-[0_0_10px_rgba(52,211,153,0.2)]">
                                    {titleName}
                                  </span>
                                </div>
                              )}
                              <p className="text-[10px] md:text-xs text-neutral-500 mt-0.5">
                                {new Date(review.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                            </div>
                          </Link>
                        
                        <div className="bg-[#34d399]/10 border border-[#34d399]/30 text-[#34d399] font-bold px-2.5 py-1 rounded-lg text-xs md:text-sm flex items-center gap-1 shadow-[0_0_10px_rgba(52,211,153,0.1)]">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 md:w-4 md:h-4 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]"><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" /></svg>
                          {review.rating}
                        </div>
                      </div>
                      
                      {review.review_text && (
                        <div className="relative mt-2">
                          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#a78bfa] to-[#34d399] rounded-l-md opacity-70"></div>
                          <p className="text-gray-300 text-sm bg-black/20 py-3 pr-3 pl-4 rounded-r-lg italic whitespace-pre-wrap">
                            "{review.review_text}"
                          </p>
                        </div>
                      )}

                      {/* Панель интерактивных действий */}
                      <ReviewActions 
                        reviewId={review.id}
                        albumId={id}
                        initialLikesCount={likesCount}
                        initialHasLiked={hasLiked}
                        initialCommentsCount={commentsCount}
                        currentUserId={currentUser?.id}
                        comments={review.review_comments || []}
                      />
                    </div>
                  );
                })
              )}
            </div>
            </CollapsibleSection>
          </div>
        </div> {/* Закрываем левую колонку */}

          {/* Правая колонка (Сайдбар) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-12">
              
              {/* Блок 1: Другие релизы */}
              {artistAlbums.length > 0 && (
                <CollapsibleSection title="Еще от автора">
                  <div className="space-y-4">
                    {artistAlbums.map((a: any) => (
                      <Link href={`/album/${a.id}`} key={a.id} className="flex items-center gap-4 group">
                        <img 
                          src={a.cover_small || a.cover_medium} 
                          alt={a.title} 
                          className="w-14 h-14 rounded-lg bg-neutral-900 object-cover group-hover:opacity-80 transition-opacity flex-shrink-0" 
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate group-hover:text-[#34d399] transition-colors">{a.title}</p>
                          <p className="text-xs text-neutral-500 mt-1">{a.release_date?.substring(0, 4)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Блок 2: Похожие артисты */}
              {relatedArtists.length > 0 && (
                <CollapsibleSection title="Похожие артисты">
                  <div className="space-y-4">
                    {relatedArtists.map((artist: any) => (
                      <Link href={`/artist/${artist.id}`} key={artist.id} className="flex items-center gap-4 group">
                        <img 
                          src={artist.picture_small || artist.picture_medium} 
                          alt={artist.name} 
                          className="w-14 h-14 rounded-full bg-neutral-900 object-cover group-hover:opacity-80 transition-opacity flex-shrink-0" 
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate group-hover:text-[#a78bfa] transition-colors">{artist.name}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

            </div>
          </div>
          
        </div> {/* Закрываем сетку */}
      </div> {/* Закрываем max-w-[1200px] */}
    </div>
  );
}