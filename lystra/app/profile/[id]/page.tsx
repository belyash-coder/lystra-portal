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
  const targetProfileId = resolvedParams.id;

  const isOwner = user?.id === targetProfileId;

  // Параллельный запрос данных и счетчиков для целевого профиля
  const [profileResult, reviewsResult, collectionsResult, followersResult, followingResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', targetProfileId).single(),
    supabase.from('reviews').select('*').eq('user_id', targetProfileId).order('created_at', { ascending: false }),
    supabase.from('collections').select('*').eq('user_id', targetProfileId).eq('item_type', 'album').order('created_at', { ascending: false }).limit(6),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetProfileId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetProfileId)
  ]);

  const profile = profileResult.data as Profile | null;
  const safeReviews = (reviewsResult.data || []) as Review[];
  const rawCollections = collectionsResult.data || [];

  const followersCount = followersResult.count || 0;
  const followingCount = followingResult.count || 0;

  if (!profile) {
    return <div className="p-12 text-center text-white">Профиль не найден</div>;
  }

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
          <div className="w-24 h-24 md:w-32 md:h-32 relative rounded-full overflow-hidden border-4 border-[#a78bfa] flex-shrink-0">
            {profile?.avatar_url ? (
              <Image 
                src={`${profile.avatar_url}?t=${new Date(profile.bio || '').getTime()}`}
                alt="Аватар пользователя" 
                fill 
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center text-3xl md:text-4xl text-[#a78bfa]">
                {profile?.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          
          <div className="text-center md:text-left flex-1 space-y-4 w-full">
            <div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                <h1 className="text-2xl md:text-3xl font-bold break-all">@{profile?.username || 'user'}</h1>
                
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
              <div className="bg-[#121212] px-4 py-3 md:px-6 rounded-xl border border-white/5 flex flex-col justify-center">
                <p className="text-xs md:text-sm text-gray-400">Подписчики</p>
                <p className="text-xl md:text-2xl font-bold text-white">{followersCount}</p>
              </div>
              <div className="bg-[#121212] px-4 py-3 md:px-6 rounded-xl border border-white/5 flex flex-col justify-center">
                <p className="text-xs md:text-sm text-gray-400">Подписки</p>
                <p className="text-xl md:text-2xl font-bold text-white">{followingCount}</p>
              </div>
              <div className="bg-[#121212] px-4 py-3 md:px-6 rounded-xl border border-[#a78bfa]/30 flex flex-col justify-center">
                <p className="text-xs md:text-sm text-gray-400">Отзывов</p>
                <p className="text-xl md:text-2xl font-bold text-[#a78bfa]">{safeReviews.length}</p>
              </div>
              <div className="bg-[#121212] px-4 py-3 md:px-6 rounded-xl border border-[#34d399]/30 flex flex-col justify-center">
                <p className="text-xs md:text-sm text-gray-400">Средняя оценка</p>
                <p className="text-xl md:text-2xl font-bold text-[#34d399]">{avgRating}</p>
              </div>
            </div>
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
            
            <ChatList currentUserId={user.id} />
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
              {favoriteAlbums.map((album) => (
                <div key={album.id} className="group relative">
                  {isOwner && album.deezer_album_id && (
                    <RemoveFromCollectionButton itemId={album.deezer_album_id} />
                  )}
                  <Link href={`/album/${album.deezer_album_id}`} className="block cursor-pointer">
                    <div className="aspect-square bg-neutral-800 rounded-xl overflow-hidden relative border border-white/5 group-hover:border-[#34d399]/50 transition-colors">
                      {album.cover_url ? (
                        <Image src={album.cover_url} alt={album.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">Нет обложки</div>
                      )}
                    </div>
                    <div className="mt-2">
                      <h3 className="text-xs md:text-sm font-bold text-white truncate group-hover:text-[#34d399] transition-colors">{album.title}</h3>
                      <p className="text-[10px] md:text-xs text-neutral-400 truncate">{album.artist}</p>
                    </div>
                  </Link>
                </div>
              ))}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {safeReviews.map((review) => (
                <ProfileReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}