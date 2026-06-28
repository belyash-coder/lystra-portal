'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// 1. Получение токенов для обложки и массива треков
export async function getReleaseUploadUrls(coverExt: string, trackExts: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Необходима авторизация')

  const coverPath = `${user.id}/${crypto.randomUUID()}.${coverExt}`
  const coverUrlRes = await supabase.storage.from('release_covers').createSignedUploadUrl(coverPath)

  if (coverUrlRes.error) throw new Error(`Ошибка generation ссылки для обложки: ${coverUrlRes.error.message}`)

  const tracksUrls = await Promise.all(trackExts.map(async (ext) => {
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`
    const res = await supabase.storage.from('audio_files').createSignedUploadUrl(path)
    if (res.error) throw new Error(`Ошибка generation ссылки для аудио: ${res.error.message}`)
    return { path, token: res.data.token }
  }))

  return {
    cover: { path: coverPath, token: coverUrlRes.data.token },
    tracks: tracksUrls
  }
}

// 2. Запись данных в связанные таблицы при создании
export async function createCompleteRelease(
  releaseData: { title: string, genre: string, release_type: string, coverPath: string },
  tracksData: { title: string, audioPath: string, duration: number, track_number: number }[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Необходима авторизация')

  // Создаем запись релиза
  const { data: release, error: releaseError } = await supabase
    .from('releases')
    .insert({
      artist_id: user.id,
      title: releaseData.title,
      genre: releaseData.genre,
      release_type: releaseData.release_type,
      cover_path: releaseData.coverPath
    })
    .select('id')
    .single()

  if (releaseError) throw new Error(`Ошибка создания релиза: ${releaseError.message}`)

  // Явно мапим audioPath из JS в audio_path для БД
  const tracksToInsert = tracksData.map(track => ({
    release_id: release.id,
    title: track.title,
    audio_path: track.audioPath,
    duration: track.duration,
    track_number: track.track_number
  }))

  const { error: tracksError } = await supabase.from('tracks').insert(tracksToInsert)
  if (tracksError) throw new Error(`Ошибка сохранения треков: ${tracksError.message}`)

  revalidatePath('/studio')
  revalidatePath('/')
}

// 3. Полное удаление релиза и всех связанных файлов из Storage
export async function deleteReleaseRecord(releaseId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Необходима авторизация')

  // Находим релиз и связанные с ним треки
  const { data: release, error: fetchError } = await supabase
    .from('releases')
    .select('artist_id, cover_path, tracks (audio_path)')
    .eq('id', releaseId)
    .single()

  if (fetchError || !release) throw new Error('Релиз не найден')
  if (release.artist_id !== user.id) throw new Error('Нет прав на удаление этого релиза')

  // Удаляем обложку из хранилища
  if (release.cover_path) {
    await supabase.storage.from('release_covers').remove([release.cover_path])
  }

  // Удаляем все аудиофайлы треков из хранилища
  if (release.tracks && release.tracks.length > 0) {
    const audioPaths = release.tracks
      .map((t: any) => t.audio_path)
      .filter(Boolean)
    
    if (audioPaths.length > 0) {
      await supabase.storage.from('audio_files').remove(audioPaths)
    }
  }

  // Удаляем записи из таблиц базы данных
  await supabase.from('tracks').delete().eq('release_id', releaseId)
  
  const { error: deleteError } = await supabase
    .from('releases')
    .delete()
    .eq('id', releaseId)

  if (deleteError) throw new Error(`Ошибка удаления из БД: ${deleteError.message}`)

  revalidatePath('/studio')
  revalidatePath('/')
  revalidatePath('/releases')
}