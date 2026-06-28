'use server'

import { createClient } from '@/utils/supabase/server' // Убедись, что путь к серверному клиенту правильный

export async function getArtistAnalytics() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Не авторизован')

  // 1. Считаем общее количество прослушиваний
  const { count: totalPlays } = await supabase
    .from('track_plays')
    .select('*', { count: 'exact', head: true })

  // 2. Считаем уникальных слушателей (у кого есть аккаунт)
  const { data: uniqueListeners } = await supabase
    .from('track_plays')
    .select('listener_id')
    .not('listener_id', 'is', null)
  
  const listenersCount = new Set(uniqueListeners?.map(p => p.listener_id)).size

  // 3. Считаем количество релизов
  const { count: totalReleases } = await supabase
    .from('releases')
    .select('*', { count: 'exact', head: true })
    .eq('artist_id', user.id)

  return {
    totalPlays: totalPlays || 0,
    uniqueListeners: listenersCount || 0,
    totalReleases: totalReleases || 0
  }
}