import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LikeButton } from '@/components/LikeButton';
import { ReviewComments } from '@/components/ReviewComments';
import { ReviewForm } from '@/components/ReviewForm';
import { FollowArtistButton } from '@/components/FollowArtistButton';

export default async function ReleasePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user;
  
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const release = await prisma.releases.findUnique({
    where: { id },
    include: { artists: true },
  });

  if (!release) {
    notFound();
  }

  // Получаем отзывы к этому релизу из нашей Prisma БД
  const reviewsData = await prisma.reviews.findMany({
    where: {
      item_id: id,
      item_type: 'release' // или 'album', в зависимости от того, как вы их сохраняли
    },
    include: {
      profiles: {
        select: {
          username: true,
          avatar_url: true
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  return (
    <main className="min-h-screen bg-[#121212] text-white p-8">
      
      {/* Шапка релиза */}
      <section className="flex flex-col md:flex-row gap-8 mb-12">
        {/* Обложка */}
        <div className="w-64 h-64 bg-zinc-800 rounded-2xl overflow-hidden shrink-0 shadow-lg shadow-[#a78bfa]/10">
          {release.cover_path ? (
            <img src={release.cover_path} alt={release.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm text-center p-4">
              Обложка недоступна
            </div>
          )}
        </div>

        {/* Информация */}
        <div className="flex flex-col justify-end">
          <span className="text-[#a78bfa] text-sm uppercase tracking-widest font-semibold mb-2">
            Независимая сцена
          </span>
          <h1 className="text-5xl font-bold mb-4">{release.title}</h1>
          <div className="flex items-center gap-4 mb-8">
            <p className="text-xl text-zinc-400">
              Артист: <span className="text-white">{release.artists.stage_name}</span>{release.genre ? <> • Жанр: {release.genre}</> : null}
            </p>
          </div>

          {/* Форма оценки и отзыва */}
          <div className="mt-4 max-w-xl">
            <ReviewForm
              itemId={release.id}
              itemType="album"
              itemTitle={release.title}
              itemArtist={release.artists.stage_name}
              itemCover={release.cover_path || ""}
            />
          </div>
        </div>
      </section>

      <hr className="border-zinc-800 mb-12" />

      {/* Секция отзывов */}
      <section>
        <h2 className="text-2xl font-bold mb-8">Отзывы слушателей <span className="text-zinc-500 text-lg font-normal">({reviewsData.length})</span></h2>
        
        <div className="space-y-6">
          {reviewsData && reviewsData.length > 0 ? (
            reviewsData.map((review) => (
              <div key={review.id.toString()} className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/50 max-w-4xl">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[#34d399]">
                      @{review.profiles?.username || 'user'}
                    </span>
                    <span className="text-[#a78bfa] font-bold text-lg flex items-center gap-1">
                      ★ {review.rating}/5
                    </span>
                  </div>
                  <span className="text-sm text-zinc-500">
                    {new Date(review.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap mb-4">
                  {review.content}
                </p>
                
                {/* Интерактивный блок: Лайки и Комментарии. 
                    Таблицы удалены из БД, поэтому передаем 0, чтобы не ломать верстку. 
                */}
                <div className="w-full mt-4 pt-4 border-t border-zinc-800/50">
                  <ReviewComments 
                    reviewId={review.id.toString()} 
                    initialCommentsCount={0} 
                  >
                    <LikeButton 
                      reviewId={review.id.toString()} 
                      initialIsLiked={false} 
                      initialLikesCount={0} 
                    />
                  </ReviewComments>
                </div>
              </div>
            ))
          ) : (
            <p className="text-zinc-500">Для этого релиза пока нет отзывов. Станьте первым!</p>
          )}
        </div>
      </section>

    </main>
  );
}