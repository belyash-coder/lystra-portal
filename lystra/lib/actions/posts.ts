'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// 1. Создание поста (возвращает готовый объект для мгновенного добавления в UI)
export async function createPostRecord(content: string, imagePath?: string, audioPath?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Необходима авторизация')

  const { data: post, error } = await supabase.from('artist_posts').insert({
    artist_id: user.id,
    content: content.trim(),
    image_path: imagePath || null,
    audio_path: audioPath || null
  }).select('*').single()

  if (error) throw new Error(`Ошибка публикации: ${error.message}`)
  
  revalidatePath('/studio')
  return post
}

// 2. Редактирование поста
export async function updatePostRecord(id: string, newContent: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Необходима авторизация')

  const { error } = await supabase
    .from('artist_posts')
    .update({ content: newContent.trim() })
    .eq('id', id)
    .eq('artist_id', user.id) // Защита: только свой пост

  if (error) throw new Error('Ошибка при редактировании')
  revalidatePath('/studio')
}

// 3. Удаление поста (и очистка файлов)
export async function deletePostRecord(id: string, imagePath?: string, audioPath?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Необходима авторизация')

  // Удаляем запись из БД
  const { error } = await supabase
    .from('artist_posts')
    .delete()
    .eq('id', id)
    .eq('artist_id', user.id)

  if (error) throw new Error('Ошибка при удалении')

  // Чистим хранилище, чтобы не копился мусор
  const filesToRemove = []
  if (imagePath) filesToRemove.push(imagePath)
  if (audioPath) filesToRemove.push(audioPath)

  if (filesToRemove.length > 0) {
    await supabase.storage.from('post_media').remove(filesToRemove)
  }

  revalidatePath('/studio')
}
// Добавь эту функцию в любое место файла lib/actions/posts.ts

export async function getPostMediaUploadUrls(imageExt?: string, audioExt?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Необходима авторизация')

  let imageUpload = null
  let audioUpload = null

  // Генерируем пропуск для картинки
  if (imageExt) {
    const path = `${user.id}/${crypto.randomUUID()}.${imageExt}`
    const res = await supabase.storage.from('post_media').createSignedUploadUrl(path)
    if (res.error) throw new Error(`Ошибка генерации ссылки для фото: ${res.error.message}`)
    imageUpload = { path, token: res.data.token }
  }

  // Генерируем пропуск для аудио
  if (audioExt) {
    const path = `${user.id}/${crypto.randomUUID()}.${audioExt}`
    const res = await supabase.storage.from('post_media').createSignedUploadUrl(path)
    if (res.error) throw new Error(`Ошибка генерации ссылки для аудио: ${res.error.message}`)
    audioUpload = { path, token: res.data.token }
  }

  return { imageUpload, audioUpload }
}