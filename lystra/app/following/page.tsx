import { createClient } from '@/lib/supabase/server'
import { GlobalReviewCard } from '@/components/GlobalReviewCard'
import { FollowingTrackCard } from '@/components/FollowingTrackCard'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const revalidate = 0 // Отключаем кэш для максимальной актуальности ленты

export default async function FollowingFeedPage() {
  const supabase = await createClient()

  // 1. Проверяем авторизацию и получаем роль
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/') // Если не авторизован, отправляем на главную
  }

  let currentUserRole: 'user' | 'moderator' | 'admin' = 'user'
  const { data: currProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
    
  if (currProfile?.role) {
    currentUserRole = currProfile.role as 'user' | 'moderator' | 'admin'
  }

  // 2. Получаем список ID пользователей, на которых подписан текущий юзер
  const { data: followsData } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const followingIds = followsData?.map(f => f.following_id) || []

  let feedItems: any[] = []

  // 3. Если есть подписки, собираем общую ленту
  if (followingIds.length > 0) {
    // 3.1. Запрашиваем отзывы
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*, profiles!user_id(username, avatar_url, role)')
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(30)

    // 3.2. Запрашиваем добавленные инди-релизы (с данными профилей)
    const { data: tracksData } = await supabase
      .from('tracks')
      .select(`
        id,
        title,
        audio_path,
        duration,
        created_at,
        user_id,
        releases!inner (
          id,
          cover_path,
          genre,
          artists (
            stage_name
          )
        ),
        profiles!user_id (
          username,
          avatar_url,
          role
        )
      `)
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(30)

    // 3.3. Добавляем маркер типа и объединяем массивы
    const formattedReviews = (reviewsData || []).map(r => ({ ...r, feed_type: 'review' }))
    const formattedTracks = (tracksData || []).map(t => ({ ...t, feed_type: 'track' }))

    // 3.4. Сортируем общий массив от новых к старым
    feedItems = [...formattedReviews, ...formattedTracks].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 md:p-12 font-sans">
      <div className="max-w-[1200px] mx-auto space-y-8">
        
        {/* Заголовок секции */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-4xl font-black tracking-tight flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#34d399] shadow-[0_0_15px_rgba(52,211,153,0.4)]"></span>
            Лента подписок
          </h1>
          <p className="text-sm text-neutral-400">
            Активность пользователей, за которыми вы следите
          </p>
        </div>

        <hr className="border-white/10" />

        {/* Проверка на наличие подписок и записей */}
        {followingIds.length === 0 ? (
          <div className="bg-white/5 border border-white/5 border-dashed p-12 rounded-2xl text-center flex flex-col items-center gap-4">
            <p className="text-sm text-neutral-500">Вы пока ни на кого не подписаны.</p>
            <Link 
              href="/reviews" 
              className="text-xs font-bold bg-[#a78bfa] text-[#121212] px-6 py-2.5 rounded-xl hover:bg-[#c4b5fd] transition-colors"
            >
              Найти авторов в Общей ленте
            </Link>
          </div>
        ) : feedItems.length === 0 ? (
          <div className="bg-white/5 border border-white/5 border-dashed p-12 rounded-2xl text-center flex flex-col items-center gap-4">
            <p className="text-sm text-neutral-500">В вашей ленте пока тихо. Пользователи еще ничего не публиковали.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {feedItems.map((item) => (
              item.feed_type === 'review' ? (
                <GlobalReviewCard 
                  key={`rev-${item.id}`} 
                  review={item} 
                  currentUserId={user.id}
                  currentUserRole={currentUserRole}
                />
              ) : (
                <FollowingTrackCard 
                  key={`trk-${item.id}`} 
                  track={item} 
                />
              )
            ))}
          </div>
        )}

      </div>
    </div>
  )
}