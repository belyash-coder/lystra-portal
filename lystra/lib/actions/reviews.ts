'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitReview(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Необходимо авторизоваться' }

  // Собираем старые и новые данные
  const itemId = formData.get('itemId') as string
  const itemType = formData.get('itemType') as string
  const rating = parseInt(formData.get('rating') as string, 10)
  const reviewText = formData.get('reviewText') as string
  
  // Метаданные для ленты
  const itemTitle = formData.get('itemTitle') as string
  const itemArtist = formData.get('itemArtist') as string
  const itemCover = formData.get('itemCover') as string

  if (!itemId || !itemType || isNaN(rating)) {
    return { error: 'Не все обязательные поля заполнены' }
  }

  const { error } = await supabase
    .from('reviews')
    .upsert({
      user_id: user.id,
      item_id: itemId,
      item_type: itemType,
      rating,
      review_text: reviewText || null,
      item_title: itemTitle,     // <- Сохраняем название
      item_artist: itemArtist,   // <- Сохраняем артиста
      item_cover: itemCover      // <- Сохраняем обложку
    }, { onConflict: 'user_id,item_id,item_type' })

  if (error) {
    return { error: 'Ошибка при сохранении отзыва: ' + error.message }
  }

  // Сбрасываем кэш страницы конкретного релиза, чтобы отзыв сразу появился в списке
  revalidatePath(`/release/${itemId}`)
  // Сбрасываем кэш главной страницы, чтобы обновилась глобальная лента активности
  revalidatePath('/')
  // Обновляем кэш профиля пользователя
  revalidatePath('/profile') 
  return { success: true }
}
export async function deleteReview(reviewId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Необходимо авторизоваться' }

  const { error } = await supabase
    .from('reviews')
    .delete()
    .match({ id: reviewId, user_id: user.id }) // Удаляем только если отзыв принадлежит текущему юзеру

  if (error) {
    return { error: 'Ошибка при удалении отзыва: ' + error.message }
  }

  // Обновляем кэш главной страницы и профиля, чтобы удаленный отзыв исчез отовсюду
  revalidatePath('/')
  revalidatePath('/profile')
  return { success: true }
}