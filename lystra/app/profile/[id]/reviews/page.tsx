import Link from 'next/link';
import { ProfileReviewCard } from '@/components/ProfileReviewCard';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const revalidate = 0;

export default async function FullReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user;

  const resolvedParams = await params;
  const targetUsername = decodeURIComponent(resolvedParams.id);

  // 1. Находим профиль по никнейму
  const profile = await prisma.profiles.findUnique({
    where: { username: targetUsername },
    select: { id: true, username: true }
  });

  if (!profile) {
    return <div className="p-12 text-center text-white">Профиль не найден</div>;
  }

  const isOwner = user?.id === profile.id;

  // Узнаем роль текущего пользователя (чтобы можно было удалять отзывы, если он админ)
  let currentUserRole: 'user' | 'moderator' | 'admin' = 'user';
  if (user?.id) {
    const currProfile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { role: true }
    });
    if (currProfile?.role) {
      currentUserRole = currProfile.role as 'user' | 'moderator' | 'admin';
    }
  }

  // 2. Вытягиваем все отзывы через Prisma
  const reviewsResult = await prisma.reviews.findMany({
    where: { user_id: profile.id },
    orderBy: { created_at: 'desc' }
  });

  // Преобразуем данные Prisma в формат, который ожидает компонент
  const reviews = reviewsResult.map(r => ({
    ...r,
    id: r.id.toString(),
    review_text: r.content,
    created_at: r.created_at.toISOString()
  })) as any[];

  return (
    <div className="min-h-screen bg-[#121212] text-white p-4 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Навигация (кнопка назад) */}
        <div>
          <Link 
            href={`/profile/${profile.username || targetUsername}`} 
            className="inline-flex items-center gap-2 text-neutral-400 hover:text-[#a78bfa] transition-colors text-sm font-medium group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Назад в профиль
          </Link>
        </div>

        {/* Заголовок */}
        <div className="flex items-end gap-3 border-b border-white/10 pb-4">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <span className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-[#a78bfa]"></span>
            Все отзывы
          </h1>
          <span className="text-neutral-500 font-medium text-lg mb-0.5">({reviews.length})</span>
        </div>

        {/* Сетка отзывов */}
        {reviews.length === 0 ? (
          <div className="bg-white/5 border border-white/5 border-dashed p-12 rounded-xl text-center">
            <p className="text-gray-500">Пользователь пока не оставил отзывов.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start pt-4">
            {reviews.map((review) => (
              <ProfileReviewCard key={review.id} review={review} isOwner={isOwner} currentUserRole={currentUserRole} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}