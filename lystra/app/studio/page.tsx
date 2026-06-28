import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Disc3, BarChart2, MessageSquare, UserCircle, Star, Music, Headphones, Users } from 'lucide-react'
import CustomAudioPlayer from "@/components/CustomAudioPlayer"
import PostFeed from "@/components/PostFeed"
import ProfileForm from "@/components/ProfileForm"
import DeleteReleaseButton from "@/components/DeleteReleaseButton"

export const revalidate = 0;

export default async function StudioDashboard({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: artist } = await supabase
    .from('artists')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!artist) redirect('/studio/onboarding')

  const resolvedSearchParams = await searchParams
  const currentTab = resolvedSearchParams.tab || 'releases'

  // Загружаем релизы
  const { data: releases } = await supabase
    .from('releases')
    .select(`
      id, title, release_type, genre, cover_path,
      tracks ( id, title, duration, track_number, audio_path )
    `)
    .eq('artist_id', artist.id)
    .order('created_at', { ascending: false })

  // Загружаем посты
  const { data: posts } = await supabase
    .from('artist_posts')
    .select('*')
    .eq('artist_id', artist.id)
    .order('created_at', { ascending: false })

  // Ищем отзывы
  const { data: artistReviews } = await supabase
    .from('reviews')
    .select('rating, review_text, item_title, created_at')
    .eq('item_artist', artist.stage_name)
    .order('created_at', { ascending: false })

  // --- СТАТИСТИКА ПРОСЛУШИВАНИЙ ---
  const trackIds = releases?.flatMap(r => r.tracks?.map(t => t.id) || []) || []
  
  let totalPlays = 0
  let uniqueListeners = 0

  if (trackIds.length > 0) {
    const { data: trackPlays } = await supabase
      .from('track_plays')
      .select('listener_id')
      .in('track_id', trackIds)
    
    if (trackPlays) {
      totalPlays = trackPlays.length
      const validListeners = trackPlays.filter(p => p.listener_id).map(p => p.listener_id)
      uniqueListeners = new Set(validListeners).size
    }
  }

  // Считаем базовые метрики
  const totalReleases = releases?.length || 0
  const totalTracks = releases?.reduce((acc, rel) => acc + (rel.tracks?.length || 0), 0) || 0
  const totalReviews = artistReviews?.length || 0
  
  const averageRating = totalReviews > 0 
    ? ((artistReviews || []).reduce((acc, rev) => acc + rev.rating, 0) / totalReviews).toFixed(1)
    : '0.0'

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Шапка Студии */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <p className="text-[#a78bfa] font-bold tracking-wider uppercase text-sm mb-2">LYSTRA Studio</p>
            <h1 className="text-4xl font-black">{artist.stage_name}</h1>
          </div>
          <Link href="/studio/releases/new" className="flex items-center gap-2 bg-[#34d399] text-[#121212] font-bold py-3 px-6 rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(52,211,153,0.2)]">
            <Plus className="w-5 h-5" /> Создать релиз
          </Link>
        </div>

        {/* Навигация по вкладкам */}
        <div className="flex items-center gap-8 border-b border-neutral-800 mb-8 overflow-x-auto pb-px">
          <Link 
            href="?tab=profile" 
            className={`flex items-center gap-2 pb-4 font-medium transition-colors border-b-2 whitespace-nowrap ${currentTab === 'profile' ? 'border-[#a78bfa] text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
          >
            <UserCircle className="w-5 h-5" /> Профиль
          </Link>
          <Link 
            href="?tab=releases" 
            className={`flex items-center gap-2 pb-4 font-medium transition-colors border-b-2 whitespace-nowrap ${currentTab === 'releases' ? 'border-[#a78bfa] text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
          >
            <Disc3 className="w-5 h-5" /> Релизы
          </Link>
          <Link 
            href="?tab=posts" 
            className={`flex items-center gap-2 pb-4 font-medium transition-colors border-b-2 whitespace-nowrap ${currentTab === 'posts' ? 'border-[#a78bfa] text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
          >
            <MessageSquare className="w-5 h-5" /> Посты
          </Link>
          <Link 
            href="?tab=analytics" 
            className={`flex items-center gap-2 pb-4 font-medium transition-colors border-b-2 whitespace-nowrap ${currentTab === 'analytics' ? 'border-[#a78bfa] text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
          >
            <BarChart2 className="w-5 h-5" /> Аналитика
          </Link>
        </div>

        {/* КОНТЕНТ ВКЛАДОК */}

        {/* 1. Вкладка: Профиль */}
        {currentTab === 'profile' && (
          <ProfileForm artist={artist} />
        )}

        {/* 2. Вкладка: Релизы */}
        {currentTab === 'releases' && (
          <div>
            {releases && releases.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {releases.map((release: any) => (
                <div key={release.id} id={`release-${release.id}`} className="bg-[#1a1a1a] p-5 rounded-2xl border border-neutral-800 flex gap-5 transition-opacity duration-300">
                    <div className="w-28 h-28 rounded-xl overflow-hidden bg-neutral-800 flex-shrink-0">
                      <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/release_covers/${release.cover_path}`} alt={release.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <h3 className="font-bold text-xl truncate">{release.title}</h3>
                          <p className="text-xs text-neutral-400 uppercase tracking-wide">{release.release_type} • {release.genre}</p>
                        </div>
                        <DeleteReleaseButton releaseId={release.id} title={release.title} />
                      </div>
                      
                      <div className="space-y-3 border-t border-neutral-800 pt-4">
                        {release.tracks?.sort((a: any, b: any) => a.track_number - b.track_number).map((track: any) => {
                          const audioUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/audio_files/${track.audio_path}`;
                          return (
                            <div key={track.id} className="bg-neutral-900/40 p-3 rounded-xl border border-neutral-800/50 flex flex-col gap-2">
                              <div className="flex justify-between items-center text-sm text-neutral-300">
                                <span className="truncate text-neutral-400 font-mono pr-2">
                                  {track.track_number}. <span className="text-white font-sans">{track.title}</span>
                                </span>
                                <span className="text-neutral-500 font-mono flex-shrink-0">
                                  {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                                </span>
                              </div>
                              {/* ПЛЕЕР С ПРАВИЛЬНЫМ TRACK ID */}
                              <CustomAudioPlayer src={audioUrl || ""} initialDuration={track?.duration || 0} trackId={track.id} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 border-2 border-dashed border-neutral-800 rounded-3xl bg-neutral-900/20">
                <Disc3 className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                <p className="text-neutral-500 font-medium">В вашей дискографии пока пусто</p>
              </div>
            )}
          </div>
        )}

        {/* 3. Вкладка: Посты */}
        {currentTab === 'posts' && (
          <PostFeed initialPosts={posts || []} artist={artist} />
        )}

       {/* 4. Вкладка: Аналитика */}
        {currentTab === 'analytics' && (
          <div className="space-y-8 max-w-4xl">
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-neutral-900/60 border border-neutral-800 p-6 rounded-2xl relative overflow-hidden">
                <div className="flex items-center gap-3 text-neutral-400 mb-2">
                  <Headphones className="w-5 h-5 text-[#34d399]" />
                  <span className="text-sm font-medium">Прослушивания</span>
                </div>
                <p className="text-4xl font-black text-white">{totalPlays}</p>
              </div>

              <div className="bg-neutral-900/60 border border-neutral-800 p-6 rounded-2xl">
                <div className="flex items-center gap-3 text-neutral-400 mb-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span className="text-sm font-medium">Слушатели</span>
                </div>
                <p className="text-4xl font-black text-white">{uniqueListeners}</p>
              </div>

              <div className="bg-[#1a1a1a] border border-neutral-800 p-6 rounded-2xl">
                <div className="flex items-center gap-3 text-neutral-400 mb-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-medium">Средний балл</span>
                </div>
                <p className="text-4xl font-black text-white">{averageRating}</p>
              </div>

              <div className="bg-[#1a1a1a] border border-neutral-800 p-6 rounded-2xl">
                <div className="flex items-center gap-3 text-neutral-400 mb-2">
                  <MessageSquare className="w-5 h-5 text-[#a78bfa]" />
                  <span className="text-sm font-medium">Отзывы</span>
                </div>
                <p className="text-4xl font-black text-white">{totalReviews}</p>
              </div>

              <div className="bg-[#1a1a1a] border border-neutral-800 p-6 rounded-2xl">
                <div className="flex items-center gap-3 text-neutral-400 mb-2">
                  <Disc3 className="w-5 h-5 text-neutral-300" />
                  <span className="text-sm font-medium">Релизы</span>
                </div>
                <p className="text-4xl font-black text-white">{totalReleases}</p>
              </div>
              
              <div className="bg-[#1a1a1a] border border-neutral-800 p-6 rounded-2xl">
                <div className="flex items-center gap-3 text-neutral-400 mb-2">
                  <Music className="w-5 h-5 text-neutral-300" />
                  <span className="text-sm font-medium">Треки</span>
                </div>
                <p className="text-4xl font-black text-white">{totalTracks}</p>
              </div>
            </div>

            <hr className="border-neutral-800" />

            {/* Лента отзывов */}
            <div>
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-[#a78bfa]" />
                Что говорят слушатели
              </h3>

              {artistReviews && artistReviews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {artistReviews.map((review: any, idx: number) => (
                    <div key={idx} className="bg-neutral-900/40 border border-neutral-800/60 p-5 rounded-2xl flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-sm font-bold text-white bg-neutral-800 px-3 py-1 rounded-full">
                            {review.item_title}
                          </span>
                          <span className="flex items-center gap-1 text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded">
                            <Star className="w-4 h-4 fill-current" /> {review.rating}
                          </span>
                        </div>
                        {review.review_text ? (
                          <p className="text-neutral-300 italic">«{review.review_text}»</p>
                        ) : (
                          <p className="text-neutral-600 italic">Оценка без текста</p>
                        )}
                      </div>
                      <span className="text-xs text-neutral-500 mt-4 block">
                        {new Date(review.created_at).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20 text-neutral-500">
                  Пока никто не оценил ваши треки. Поделитесь ссылкой на релиз в своих соцсетях!
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}