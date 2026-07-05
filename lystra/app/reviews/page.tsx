import { createClient } from '@/lib/supabase/server'
import { ReviewsFeed } from '@/components/ReviewsFeed'

export const revalidate = 0 // Отключаем кэш для максимальной актуальности ленты

export default async function GlobalReviewsPage() {
  const supabase = await createClient()

  // 1. Получаем сессию текущего пользователя и его роль
  const { data: { user } } = await supabase.auth.getUser()
  let currentUserRole: 'user' | 'moderator' | 'admin' = 'user'
  
  if (user) {
    const { data: currProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (currProfile?.role) {
      currentUserRole = currProfile.role as 'user' | 'moderator' | 'admin'
    }
  }

  // 2. Запрашиваем первые 20 отзывов со связью таблицы профилей авторов
  const { data: reviewsData, error } = await supabase
    .from('reviews')
    .select('*, profiles!user_id(username, avatar_url, role)')
    .order('created_at', { ascending: false })
    .limit(20)

  

  const reviews = (reviewsData || []) as any[]

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 md:p-12 font-sans">
      <div className="max-w-[1200px] mx-auto space-y-8">
        
        {/* Заголовок секции */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-4xl font-black tracking-tight flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-gradient-to-tr from-[#a78bfa] to-[#34d399] shadow-[0_0_15px_rgba(52,211,153,0.4)]"></span>
            Общие отзывы и рецензии
          </h1>
          <p className="text-sm text-neutral-400">
            Что слушают, обсуждают и оценивают прямо сейчас в экосистеме LYSTRA
          </p>
        </div>

        <hr className="border-white/10" />

        {/* Сетка фида рецензий (Client Component с пагинацией и Realtime) */}
        <ReviewsFeed 
          initialReviews={reviews} 
          currentUserId={user?.id} 
          currentUserRole={currentUserRole} 
        />

      </div>
    </div>
  )
}