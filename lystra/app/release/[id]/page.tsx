import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LikeButton } from '@/components/LikeButton';
import { ReviewComments } from '@/components/ReviewComments';
import { ReviewForm } from '@/components/ReviewForm';
import { FollowArtistButton } from '@/components/FollowArtistButton';
export default async function ReleasePage({ params }: { params: { id: string } }) {
  // ВАЖНО: Асинхронный вызов клиента
  const supabase = await createClient();
  
  // В новых версиях Next.js params также нужно получать через await
  const { id } = await params;

  // Получаем текущего пользователя для проверки лайков
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Получаем данные самого релиза вместе с именем артиста
  const { data: release, error: releaseError } = await supabase
    .from('releases')
    .select('*, artists(stage_name)')
    .eq('id', id)
    .single();

  if (releaseError || !release) {
    return notFound();
  }

  // 2. Получаем все отзывы к этому релизу со всеми связями
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      *,
      profiles!reviews_user_id_fkey (
        username,
        avatar_url
      ),
      likes (
        user_id
      ),
      comments (
        count
      )
    `)
    .eq('item_id', id)
    .eq('item_type', 'release')
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-[#121212] text-white p-8">
      
      {/* Шапка релиза */}
      <section className="flex flex-col md:flex-row gap-8 mb-12">
        {/* Обложка */}
        <div className="w-64 h-64 bg-zinc-800 rounded-2xl overflow-hidden shrink-0 shadow-lg shadow-[#a78bfa]/10">
           {release.cover_path ? (
             <img 
               src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/release_covers/${release.cover_path}`} 
               alt={release.title} 
               className="w-full h-full object-cover" 
             />
           ) : (
             <div className="w-full h-full flex items-center justify-center text-zinc-500">Нет обложки</div>
           )}
        </div>
        
        {/* Информация */}
        <div className="flex flex-col justify-end">
          <span className="text-[#a78bfa] text-sm uppercase tracking-widest font-semibold mb-2">
            {release.release_type || 'album'}
          </span>
          <h1 className="text-5xl font-bold mb-4">{release.title}</h1>
          <div className="flex items-center gap-4 mb-8">
            <p className="text-xl text-zinc-400">
              Артист: <span className="text-white">{release.artists?.stage_name || 'Неизвестный артист'}</span> • Жанр: {release.genre}
            </p>
            {user && user.id !== release.artist_id && (
              <FollowArtistButton 
                artistId={release.artist_id} 
                currentUserId={user.id}
              />
            )}
          </div>
          
          {/* Форма оценки и отзыва */}
          <div className="mt-4 max-w-xl">
            <ReviewForm 
              itemId={release.id}
              itemType={(release.release_type as 'album' | 'track') || 'album'}
              itemTitle={release.title}
              itemArtist={release.artists?.stage_name || 'Неизвестный артист'}
              itemCover={release.cover_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/release_covers/${release.cover_path}` : ''}
            />
          </div>
        </div>
      </section>

      <hr className="border-zinc-800 mb-12" />

      {/* Секция отзывов */}
      <section>
        <h2 className="text-2xl font-bold mb-8">Отзывы слушателей <span className="text-zinc-500 text-lg font-normal">({reviews?.length || 0})</span></h2>
        
        <div className="space-y-6">
          {reviews && reviews.length > 0 ? (
            reviews.map((review: any) => (
              <div key={review.id} className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/50 max-w-4xl">
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
                  {review.review_text}
                </p>
                
                {/* Интерактивный блок: Лайки и Комментарии */}
                <div className="w-full mt-4 pt-4 border-t border-zinc-800/50">
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
            ))
          ) : (
            <p className="text-zinc-500">Для этого релиза пока нет отзывов. Станьте первым!</p>
          )}
        </div>
      </section>

    </main>
  );
}