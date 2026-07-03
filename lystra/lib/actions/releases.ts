'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// 1. Полное удаление релиза и всех связанных файлов из Storage (ОСТАВЛЯЕМ ДЛЯ СТАРЫХ РЕЛИЗОВ)
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