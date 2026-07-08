'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function submitReview(formData: FormData) {
  const session = await auth()
  const user = session?.user
  
  if (!user?.id) return { error: 'Необходимо авторизоваться' }

  const itemId = formData.get('itemId') as string
  const itemType = formData.get('itemType') as string
  const rating = parseInt(formData.get('rating') as string, 10)
  const reviewText = formData.get('reviewText') as string
  
  const itemTitle = formData.get('itemTitle') as string
  const itemArtist = formData.get('itemArtist') as string
  const itemCover = formData.get('itemCover') as string

  if (!itemId || !itemType || isNaN(rating)) {
    return { error: 'Не все обязательные поля заполнены' }
  }

  try {
    // Проверяем, есть ли уже отзыв
    const existingReview = await prisma.reviews.findFirst({
      where: { user_id: user.id, item_id: itemId, item_type: itemType }
    })

    if (existingReview) {
      await prisma.reviews.update({
        where: { id: existingReview.id },
        data: { rating, content: reviewText || null, item_title: itemTitle, item_artist: itemArtist, item_cover: itemCover }
      })
    } else {
      await prisma.reviews.create({
        data: { user_id: user.id, item_id: itemId, item_type: itemType, rating, content: reviewText || null, item_title: itemTitle, item_artist: itemArtist, item_cover: itemCover }
      })
    }

    revalidatePath(`/release/${itemId}`)
    revalidatePath('/')
    revalidatePath('/profile') 
    return { success: true }
  } catch (error: any) {
    return { error: 'Ошибка при сохранении отзыва: ' + error.message }
  }
}

export async function deleteReview(reviewId: string) {
  const session = await auth()
  const user = session?.user
  if (!user?.id) return { error: 'Необходимо авторизоваться' }

  try {
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { role: true }
    })

    const isAdminOrMod = profile?.role === 'admin' || profile?.role === 'moderator'
    
    // Prisma ожидает BigInt для id. Преобразуем строку в BigInt.
    const reviewIdBigInt = BigInt(reviewId)

    if (isAdminOrMod) {
      await prisma.reviews.delete({ where: { id: reviewIdBigInt } })
    } else {
      // Удаляем только если совпадает user_id
      await prisma.reviews.deleteMany({
        where: { id: reviewIdBigInt, user_id: user.id }
      })
    }

    revalidatePath('/')
    revalidatePath('/profile')
    return { success: true }
  } catch (error: any) {
    return { error: 'Ошибка при удалении отзыва: ' + error.message }
  }
}

export async function toggleReviewLike(reviewId: string, albumId: string) {
  const session = await auth()
  const user = session?.user
  if (!user?.id) return { error: 'Необходимо авторизоваться' }

  try {
    const reviewIdBigInt = BigInt(reviewId)
    
    const existingLike = await prisma.review_likes.findFirst({
      where: { user_id: user.id, review_id: reviewIdBigInt }
    })

    if (existingLike) {
      await prisma.review_likes.deleteMany({
        where: { user_id: user.id, review_id: reviewIdBigInt }
      })
    } else {
      await prisma.review_likes.create({
        data: { user_id: user.id, review_id: reviewIdBigInt }
      })
    }

    revalidatePath(`/album/${albumId}`)
    return { success: true }
  } catch (error: any) {
    return { error: 'Ошибка: ' + error.message }
  }
}

export async function submitComment(reviewId: string, content: string, albumId: string, parentId?: string) {
  const session = await auth()
  const user = session?.user
  if (!user?.id) return { error: 'Необходимо авторизоваться' }
  if (!content.trim()) return { error: 'Комментарий не может быть пустым' }

  try {
    await prisma.comments.create({
      data: {
        user_id: user.id,
        review_id: BigInt(reviewId),
        content: content.trim(),
        parent_id: parentId ? BigInt(parentId) : null
      }
    })

    revalidatePath(`/album/${albumId}`)
    return { success: true }
  } catch (error: any) {
    return { error: 'Ошибка при добавлении комментария: ' + error.message }
  }
}

export async function deleteComment(commentId: string, albumId: string) {
  const session = await auth()
  const user = session?.user
  if (!user?.id) return { error: 'Необходимо авторизоваться' }

  try {
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { role: true }
    })

    const isAdminOrMod = profile?.role === 'admin' || profile?.role === 'moderator'
    const commentIdBigInt = BigInt(commentId)

    if (isAdminOrMod) {
      await prisma.comments.delete({ where: { id: commentIdBigInt } })
    } else {
      await prisma.comments.deleteMany({
        where: { id: commentIdBigInt, user_id: user.id }
      })
    }

    revalidatePath(`/album/${albumId}`)
    return { success: true }
  } catch (error: any) {
    return { error: 'Ошибка при удалении комментария: ' + error.message }
  }
}