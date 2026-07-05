import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

import EditProfileModal from '@/components/EditProfileModal';
import GenreSelector from '@/components/GenreSelector';
import { RemoveFromCollectionButton } from '@/components/RemoveFromCollectionButton';
import { ProfileReviewCard } from '@/components/ProfileReviewCard';
import { FollowButton } from '@/components/FollowButton';
import { ChatWidgetLauncher } from '@/components/ChatWidgetLauncher';
import { ChatList } from '@/components/ChatList';

// Отключаем кэширование, чтобы чаты и отзывы всегда были актуальными
export const revalidate = 0;

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  favorite_genres: string[] | null;
  active_title_id: string | null;
  role: 'user' | 'moderator' | 'admin';
}

interface Review {
  id: string;
  item_id: string;
  item_type: string;
  item_title: string | null;
  item_artist: string | null;
  item_cover: string | null;
  review_text: string | null;
  rating: number;
  created_at: string;
}

interface FavoriteAlbum {
  id: string;
  deezer_album_id: string | null;
  title: string;
  artist: string;
  cover_url: string | null;
}

export default async function DynamicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const resolvedParams = await params;
  const targetUsername = decodeURIComponent(resolvedParams.id); // Читаем никнейм из URL

  // 1. Сначала находим профиль по никнейму
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', targetUsername)
    .single();

  const profile = profileData as Profile | null;

  if (!profile) {
    return <div className="p-12 text-center text-white">Профиль не найден</div>;
  }

  // 2. Берем его реальный системный ID для остальных запросов
  const targetProfileId = profile.id;
  const isOwner = user?.id === targetProfileId;

  // Получаем роль текущего авторизованного пользователя для проверки прав модератора
  let currentUserRole: 'user' | 'moderator' | 'admin' = 'user';
  if (user) {
    const { data: currProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (currProfile?.role) {
      currentUserRole = currProfile.role as 'user' | 'moderator' | 'admin';
    }
  }

  // 3. Параллельно запрашиваем остальные данные по реальному ID
  const [reviewsResult, collectionsResult, followersResult, followingResult] = await Promise.all([
    supabase.from('reviews').select('*').eq('user_id', targetProfileId).order('created_at', { ascending: false }),
    supabase.from('collections').select('*').eq('user_id', targetProfileId).eq('item_type', 'album').order('created_at', { ascending: false }),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetProfileId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetProfileId)
  ]);

  const safeReviews = (reviewsResult.data || []) as Review[];
  const rawCollections = collectionsResult.data || [];

  const followersCount = followersResult.count || 0;
  const followingCount = followingResult.count || 0;

  // 1. Подтягиваем статистику для рамок
  const { data: statsData } = await supabase.from('user_stats').select('*').eq('user_id', targetProfileId).maybeSingle();
  const totalActivity = (statsData?.releases_count || 0) + (statsData?.reviews_count || 0) + (statsData?.comments_count || 0);
  
  // Расчет рамок на лету
  let ringClasses = "border-2 border-transparent"; // 1 уровень
  if (totalActivity >= 300) {
    // 4 уровень: Толстый градиент + темный зазор + внешняя лавандовая линия (сложная двойная рамка)
    ringClasses = "p-1.5 bg-gradient-to-tr from-[#a78bfa] via-[#34d399] to-[#a78bfa] shadow-[0_0_0_4px_#121212,0_0_0_6px_#a78bfa]";
  } else if (totalActivity >= 100) {
    ringClasses = "border-4 border-[#34d399] shadow-[0_0_15px_rgba(52,211,153,0.3)]"; // 3 уровень (Мятный со свечением)
  } else if (totalActivity >= 28) {
    ringClasses = "border-2 border-[#a78bfa] ring-4 ring-[#121212] ring-offset-1 ring-offset-[#a78bfa]"; // 2 уровень (Лавандовый)
  }

  // 2. Подтягиваем активное звание (плашку)
  let activeTitle = null;
  if (profile.active_title_id) {
    const { data: titleData } = await supabase.from('achievements').select('*').eq('id', profile.active_title_id).single();
    activeTitle = titleData;
  }

  // 3. Подтягиваем все значки/медальки
  const { data: medalsData } = await supabase.from('user_achievements').select('achievements(*)').eq('user_id', targetProfileId);
  const medals = medalsData?.map((m: any) => m.achievements).filter((a: any) => a?.type === 'medal') || [];

  let isFollowing = false;
  let initialMessages: any[] = [];

  if (!isOwner && user) {
    const { data: followData } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', targetProfileId)
      .maybeSingle(); 
    isFollowing = !!followData;

    // Подтягиваем историю сообщений для виджета чата
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetProfileId}),and(sender_id.eq.${targetProfileId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    
    if (messagesData) initialMessages = messagesData;
  }

  const favoriteAlbums = await Promise.all(
    rawCollections.map(async (item) => {
      try {
        const res = await fetch(`https://api.deezer.com/album/${item.item_id}`);
        if (!res.ok) return null;
        const albumData = await res.json();
        if (albumData.error) return null;
        return {
          id: item.id,
          deezer_album_id: item.item_id,
          title: albumData.title,
          artist: albumData.artist?.name,
          cover_url: albumData.cover_medium,
        };
      } catch (err) {
        return null;
      }
    })
  ).then(results => results.filter(Boolean)) as FavoriteAlbum[];

  const avgRating = safeReviews.length
    ? (safeReviews.reduce((acc, curr) => acc + curr.rating, 0) / safeReviews.length).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-[#121212] text-white p-4 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-10 md:space-y-12">
        
        <section className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 bg-white/5 p-5 md:p-8 rounded-2xl border border-white/10 relative">
          <div className={`w-24 h-24 md:w-32 md:h-32 relative rounded-full flex-shrink-0 transition-all z-10 ${ringClasses}`}>
            {/* Анимация свечения для максимального уровня (увеличен радиус из-за двойной рамки) */}
            {totalActivity >= 300 && (
              <div className="absolute -inset-3 bg-gradient-to-tr from-[#a78bfa] to-[#34d399] rounded-full blur-xl opacity-50 animate-pulse -z-10"></div>
            )}
            <div className="w-full h-full relative rounded-full overflow-hidden bg-gray-800">
              {profile?.avatar_url ? (
                <Image 
                  src={`${profile.avatar_url}?t=${new Date(profile.bio || '').getTime()}`}
                  alt="Аватар пользователя" 
                  fill 
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl md:text-4xl text-white/50">
                  {profile?.username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </div>
          
          <div className="text-center md:text-left flex-1 space-y-4 w-full">
            <div>
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4">
                <div className="flex flex-col items-start gap-1.5">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-bold break-all">@{profile?.username || 'user'}</h1>
                    {profile?.role === 'admin' && (
                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-500 border border-rose-500/30 text-[10px] rounded-md font-bold uppercase tracking-wider shadow-[0_0_8px_rgba(244,63,94,0.2)]">Admin</span>
                    )}
                    {profile?.role === 'moderator' && (
                      <span className="px-2 py-0.5 bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] rounded-md font-bold uppercase tracking-wider shadow-[0_0_8px_rgba(56,189,248,0.2)]">Moder</span>
                    )}
                  </div>
                  {activeTitle && (
                    <div className="group relative inline-block cursor-help">
                      <span className="px-3 py-0.5 bg-[#34d399] text-[#121212] text-xs rounded-full font-bold inline-block shadow-[0_0_10px_rgba(52,211,153,0.2)]">
                        {activeTitle.name}
                      </span>
                      
                      {/* Всплывающая подсказка */}
                      <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-10 w-max max-w-[200px] translate-y-2 group-hover:translate-y-0">
                        <div className="bg-[#121212] border border-white/10 text-white text-xs py-2 px-3 rounded-xl shadow-2xl relative text-center">
                          <p className="font-bold text-[#a78bfa]">Текущий статус</p>
                          <p className="text-neutral-400 mt-1 leading-snug">{activeTitle.description}</p>
                          {/* Маленький треугольник для подсказки */}
                          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#121212] border-b border-r border-white/10 rotate-45"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {isOwner ? (
                  <EditProfileModal profile={profile} />
                ) : (
                  user && (
                    <div className="flex items-center gap-2">
                      <FollowButton targetUserId={profile.id} initialIsFollowing={isFollowing} />
                      
                      <ChatWidgetLauncher 
                        currentUserId={user.id} 
                        targetProfile={{
                          id: profile.id,
                          username: profile.username || 'user',
                          avatar_url: profile.avatar_url
                        }} 
                        initialMessages={initialMessages} 
                      />
                    </div>
                  )
                )}
              </div>
              
              <p className="text-sm text-neutral-400 mt-2 max-w-xl italic">
                {profile?.bio || 'Описание профиля не заполнено.'}
              </p>

              <div className="mt-4 flex justify-center md:justify-start">
                <GenreSelector 
                  profileId={profile.id} 
                  initialGenres={profile.favorite_genres || []} 
                  isEditable={isOwner} 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 md:flex md:flex-wrap justify-center md:justify-start gap-3 md:gap-4 pt-2">
              <div className="bg-gradient-to-br from-white/5 to-transparent px-4 py-3 md:px-6 rounded-xl border border-white/10 flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute -right-2 -bottom-2 p-2 opacity-5 group-hover:opacity-10 transition-opacity"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
                <p className="text-xs md:text-sm text-neutral-400 z-10">Подписчики</p>
                <p className="text-xl md:text-2xl font-bold text-white z-10">{followersCount}</p>
              </div>
              <div className="bg-gradient-to-br from-white/5 to-transparent px-4 py-3 md:px-6 rounded-xl border border-white/10 flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute -right-2 -bottom-2 p-2 opacity-5 group-hover:opacity-10 transition-opacity"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg></div>
                <p className="text-xs md:text-sm text-neutral-400 z-10">Подписки</p>
                <p className="text-xl md:text-2xl font-bold text-white z-10">{followingCount}</p>
              </div>
              <div className="bg-gradient-to-br from-[#a78bfa]/10 to-transparent px-4 py-3 md:px-6 rounded-xl border border-[#a78bfa]/20 flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute -right-2 -bottom-2 p-2 opacity-10 text-[#a78bfa] group-hover:opacity-20 transition-opacity"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg></div>
                <p className="text-xs md:text-sm text-[#a78bfa]/80 z-10">Отзывов</p>
                <p className="text-xl md:text-2xl font-bold text-[#a78bfa] z-10">{safeReviews.length}</p>
              </div>
              <div className="bg-gradient-to-br from-[#34d399]/10 to-transparent px-4 py-3 md:px-6 rounded-xl border border-[#34d399]/20 flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute -right-2 -bottom-2 p-2 opacity-10 text-[#34d399] group-hover:opacity-20 transition-opacity"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div>
                <p className="text-xs md:text-sm text-[#34d399]/80 z-10">Средняя оценка</p>
                <p className="text-xl md:text-2xl font-bold text-[#34d399] z-10">{avgRating}</p>
              </div>
            </div>

            {/* Стенд с медальками */}
              {medals.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-[10px] text-neutral-500 mb-2 uppercase tracking-widest font-semibold">Награды</p>
                  <div className="flex flex-wrap gap-3">
                    {medals.map((medal: any) => (
                      <div key={medal.id} className="group relative flex items-center justify-center w-11 h-11 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:border-[#a78bfa]/50 hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(167,139,250,0.15)] transition-all duration-300 cursor-help">
                        
                        {/* Векторные иконки наград */}
                        {medal.icon_name === 'star' && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        )}
                        {medal.icon_name === 'zap' && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#34d399] drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                        )}
                        {medal.icon_name === 'flame' && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>
                        )}
                        {medal.icon_name === 'headphones' && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#a78bfa] drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>
                        )}
                        {medal.icon_name === 'message-circle' && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        )}
                        {medal.icon_name === 'disc' && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
                        )}
                        {medal.icon_name === 'heart' && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        )}
                        {medal.icon_name === 'shield' && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        )}
                        {(!['star', 'zap', 'flame', 'headphones', 'message-circle', 'disc', 'heart', 'shield'].includes(medal.icon_name)) && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-neutral-400"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                        )}
                        
                        {/* Всплывающая подсказка */}
                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-10 w-max max-w-[200px] translate-y-2 group-hover:translate-y-0">
                          <div className="bg-[#121212] border border-white/10 text-white text-xs py-2 px-3 rounded-xl shadow-2xl relative">
                            <p className="font-bold text-[#a78bfa]">{medal.name}</p>
                            <p className="text-neutral-400 mt-1 leading-snug">{medal.description}</p>
                            {/* Маленький треугольник для подсказки */}
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#121212] border-b border-r border-white/10 rotate-45"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </section>

        <hr className="border-white/10" />

        {isOwner && user && (
          <section>
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-400"></span>
                Мои диалоги
              </h2>
            </div>
            
            <ChatList currentUserId={user.id} username={profile?.username || ''} limit={5} />
          </section>
        )}

        {isOwner && user && <hr className="border-white/10" />}

        <section>
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#34d399]"></span>
              Любимые релизы
            </h2>
          </div>
          
          {favoriteAlbums.length === 0 ? (
            <div className="bg-white/5 border border-white/5 border-dashed p-6 md:p-8 rounded-xl text-center flex flex-col items-center justify-center gap-3">
              <p className="text-sm md:text-base text-gray-500">Витрина пуста.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              {favoriteAlbums.slice(0, 5).map((album) => (
                <div key={album.id} className="group relative z-10 hover:z-50 transition-all delay-500 hover:delay-0">
                  {isOwner && album.deezer_album_id && (
                    <div className="absolute top-2 right-2 z-20">
                      <RemoveFromCollectionButton itemId={album.deezer_album_id} />
                    </div>
                  )}
                  <Link href={`/album/${album.deezer_album_id}`} className="block cursor-pointer">
                    <div className="relative aspect-square z-10 rounded-xl">
                      {/* Выезжающий винил */}
                      <div className="absolute inset-0 bg-[#0a0a0a] rounded-full border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 group-hover:translate-x-4 sm:group-hover:translate-x-8 group-hover:rotate-[60deg] transition-all duration-700 ease-in-out flex items-center justify-center -z-10">
                        <div className="w-1/3 h-1/3 bg-gradient-to-tr from-[#a78bfa] to-[#34d399] rounded-full flex items-center justify-center shadow-inner">
                          <div className="w-2 h-2 bg-[#121212] rounded-full"></div>
                        </div>
                        <div className="absolute inset-1 border border-white/5 rounded-full"></div>
                        <div className="absolute inset-4 border border-white/5 rounded-full"></div>
                      </div>
                      {/* Сама обложка */}
                      <div className="absolute inset-0 bg-neutral-800 rounded-xl overflow-hidden border border-white/5 group-hover:border-[#34d399]/50 transition-colors shadow-lg group-hover:shadow-[0_8px_20px_rgba(52,211,153,0.15)] z-10">
                        {album.cover_url ? (
                          <Image src={album.cover_url} alt={album.title} fill className="object-cover transition-transform duration-500" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">Нет обложки</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 relative z-10">
                      <h3 className="text-xs md:text-sm font-bold text-white truncate group-hover:text-[#34d399] transition-colors">{album.title}</h3>
                      <p className="text-[10px] md:text-xs text-neutral-400 truncate">{album.artist}</p>
                    </div>
                  </Link>
                </div>
              ))}

              {favoriteAlbums.length > 5 && (
                <Link 
                  href={`/profile/${profile?.username || profile?.id}/collection`} 
                  className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#34d399]/10 to-transparent border border-[#34d399]/20 hover:border-[#34d399]/50 hover:shadow-[0_8px_24px_rgba(52,211,153,0.15)] rounded-xl cursor-pointer group transition-all duration-300 aspect-square"
                >
                  <div className="flex flex-col items-center gap-1.5 text-[#34d399] font-bold group-hover:text-[#6ee7b7] transition-colors text-center text-sm md:text-base">
                    <span>Все релизы</span>
                    <span className="text-xs font-normal text-neutral-400">({favoriteAlbums.length})</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-1 group-hover:translate-x-1 transition-transform">
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </div>
                </Link>
              )}
            </div>
          )}
        </section>

        <section>
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#a78bfa]"></span>
              {isOwner ? 'Мои отзывы' : 'Отзывы пользователя'}
            </h2>
          </div>
          
          {safeReviews.length === 0 ? (
            <p className="text-sm md:text-base text-gray-500 bg-white/5 p-6 md:p-8 rounded-xl text-center">
              {isOwner ? 'Вы еще не оставили ни одного отзыва.' : 'Пользователь пока не оставил отзывов.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start">
              {safeReviews.slice(0, 3).map((review) => (
                <ProfileReviewCard key={review.id} review={review} isOwner={isOwner} currentUserRole={currentUserRole} />
              ))}
              
              {safeReviews.length > 3 && (
                <Link 
                  href={`/profile/${profile?.username || profile?.id}/reviews`} 
                  className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#a78bfa]/10 to-transparent border border-[#a78bfa]/20 hover:border-[#a78bfa]/50 hover:shadow-[0_8px_24px_rgba(167,139,250,0.15)] rounded-2xl cursor-pointer group transition-all duration-300 min-h-[140px] h-full"
                >
                  <div className="flex items-center gap-3 text-[#a78bfa] font-bold group-hover:text-[#c4b5fd] transition-colors text-lg md:text-xl">
                    <span>Смотреть все ({safeReviews.length})</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1.5 transition-transform">
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </div>
                </Link>
              )}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}