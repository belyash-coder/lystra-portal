'use server'

import { createClient } from '@/lib/supabase/server' 
import { revalidatePath } from 'next/cache'

// ==========================================
// ПОДПИСКИ (FOLLOWS)
// ==========================================

export async function toggleFollow(followingId: string, currentPath: string) {
  const supabase = await createClient() // <- Добавлен await
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Необходима авторизация')

  const { data: existingFollow } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', followingId)
    .single()

  if (existingFollow) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .match({ follower_id: user.id, following_id: followingId })
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: followingId })
    if (error) throw new Error(error.message)
  }

  revalidatePath(currentPath)
}

// ==========================================
// ЛАЙКИ (ОТЗЫВЫ)
// ==========================================

export async function toggleReviewLike(reviewId: string, currentPath: string) {
  const supabase = await createClient() // <- Добавлен await
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Необходима авторизация')

  const { data: existingLike } = await supabase
    .from('review_likes')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('review_id', reviewId)
    .single()

  if (existingLike) {
    await supabase.from('review_likes').delete().match({ user_id: user.id, review_id: reviewId })
  } else {
    await supabase.from('review_likes').insert({ user_id: user.id, review_id: reviewId })
  }

  revalidatePath(currentPath)
}

// ==========================================
// КОММЕНТАРИИ (ОТЗЫВЫ)
// ==========================================

export async function addReviewComment(reviewId: string, content: string, currentPath: string) {
  const supabase = await createClient() // <- Добавлен await
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Необходима авторизация')

  if (!content.trim()) throw new Error('Комментарий не может быть пустым')

  const { error } = await supabase
    .from('review_comments')
    .insert({
      user_id: user.id,
      review_id: reviewId,
      content: content.trim()
    })

  if (error) throw new Error(error.message)

  revalidatePath(currentPath)
}
export async function updateReviewComment(commentId: string, newContent: string, currentPath: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Необходима авторизация')

  if (!newContent.trim()) throw new Error('Комментарий не может быть пустым')

  const { error } = await supabase
    .from('review_comments')
    .update({ 
      content: newContent.trim(),
      updated_at: new Date() // Обновляем время редактирования
    })
    .match({ id: commentId, user_id: user.id }) // user_id гарантирует, что обновит только автор

  if (error) throw new Error(error.message)
  revalidatePath(currentPath)
}

export async function deleteReviewComment(commentId: string, currentPath: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Необходима авторизация')

  const { error } = await supabase
    .from('review_comments')
    .delete()
    .match({ id: commentId, user_id: user.id }) // Только автор может удалить

  if (error) throw new Error(error.message)
  revalidatePath(currentPath)
}

export async function reportComment(commentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Необходима авторизация')

  // Проверяем, не жаловался ли юзер на этот коммент ранее, чтобы не спамили
  const { data: existingReport } = await supabase
    .from('comment_reports')
    .select('id')
    .eq('reporter_id', user.id)
    .eq('comment_id', commentId)
    .single()

  if (existingReport) {
    throw new Error('Вы уже отправили жалобу на этот комментарий')
  }

  const { error } = await supabase
    .from('comment_reports')
    .insert({
      reporter_id: user.id,
      comment_id: commentId
    })

  if (error) throw new Error(error.message)
  // Здесь revalidatePath не обязателен, так как UI жалобы не меняется глобально
}