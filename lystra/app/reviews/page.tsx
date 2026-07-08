import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { ReviewsFeed } from '@/components/ReviewsFeed'

export const revalidate = 0 // Отключаем кэш для максимальной актуальности ленты

export default async function GlobalReviewsPage() {
  // 1. Получаем сессию текущего пользователя и его роль
  const session = await auth()
  const userId = session?.user?.id
  
  let currentUserRole: 'user' | 'moderator' | 'admin' = 'user'
  
  if (userId) {
    // Временно запрашиваем только id, так как поля role пока нет в схеме Prisma
    const currProfile = await prisma.profiles.findUnique({
      where: { id: userId },
      select: { id: true }
    })
    // Роль пока остается 'user' по умолчанию
  }

  // 2. Запрашиваем первые 20 отзывов со связью таблицы профилей авторов
  const reviewsData = await prisma.reviews.findMany({
    take: 20,
    orderBy: { created_at: 'desc' },
    include: {
      profiles: {
        select: { username: true, avatar_url: true }
      }
    }
  })

  // Конвертируем BigInt в строку и маппим поля для клиента
  const reviews = reviewsData.map((r: any) => ({
    ...r,
    id: r.id.toString(),
    review_text: r.content // В Prisma поле обычно называется content
  }))

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

        {/* Сетка фида рецензий (Client Component с пагинацией) */}
        <ReviewsFeed 
          initialReviews={reviews} 
          currentUserId={userId} 
          currentUserRole={currentUserRole} 
        />

      </div>
    </div>
  )
}