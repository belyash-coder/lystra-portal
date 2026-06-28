'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// 1. Экшен для выдачи временных ссылок (чтобы клиент мог сам загрузить файлы)
export async function getSignedUploadUrls(audioName: string, coverName: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) throw new Error('Необходима авторизация')

  // Генерируем уникальные пути
  const audioPath = `${user.id}/${crypto.randomUUID()}.${audioName.split('.').pop()}`
  const coverPath = `${user.id}/${crypto.randomUUID()}.${coverName.split('.').pop()}`

  // Запрашиваем у Supabase временные токены на загрузку именно по этим путям
  const [audioRes, coverRes] = await Promise.all([
    supabase.storage.from('audio_files').createSignedUploadUrl(audioPath),
    supabase.storage.from('release_covers').createSignedUploadUrl(coverPath)
  ])

  if (audioRes.error) throw new Error(`Ошибка аудио: ${audioRes.error.message}`)
  if (coverRes.error) throw new Error(`Ошибка обложки: ${coverRes.error.message}`)

  return {
    audio: { path: audioPath, token: audioRes.data.token },
    cover: { path: coverPath, token: coverRes.data.token }
  }
}

// 2. Экшен для создания карточки трека в БД (вызывается после успешной загрузки)
export async function createReleaseRecord(data: { title: string, genre: string, audioPath: string, coverPath: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Необходима авторизация')

  const { error } = await supabase.from('releases').insert({
    user_id: user.id,
    title: data.title,
    genre: data.genre,
    audio_path: data.audioPath,
    cover_path: data.coverPath,
    duration: 180 // Пока ставим заглушку длительности
  })

  if (error) throw new Error(`Ошибка сохранения в БД: ${error.message}`)

  // Обновляем кэш портала
  revalidatePath('/studio')
  revalidatePath('/')
}