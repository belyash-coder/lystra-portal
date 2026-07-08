'use server'

import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// ==========================================
// ПОДПИСКИ (FOLLOWS)
// ==========================================
export async function toggleFollow(followingId: string, currentPath: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Необходима авторизация')
  console.warn('Таблица follows отсутствует в схеме Prisma. Действие пропущено.')
  revalidatePath(currentPath)
}

// ==========================================
// ЛАЙКИ (ОТЗЫВЫ)
// ==========================================
export async function toggleReviewLike(reviewId: string, currentPath: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Необходима авторизация')
  console.warn('Таблица review_likes отсутствует в схеме Prisma. Действие пропущено.')
  revalidatePath(currentPath)
}

// ==========================================
// КОММЕНТАРИИ (ОТЗЫВЫ)
// ==========================================
export async function addReviewComment(reviewId: string, content: string, currentPath: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Необходима авторизация')
  console.warn('Таблица review_comments отсутствует в схеме Prisma.')
  revalidatePath(currentPath)
}

export async function updateReviewComment(commentId: string, newContent: string, currentPath: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Необходима авторизация')
  console.warn('Таблица review_comments отсутствует в схеме Prisma.')
  revalidatePath(currentPath)
}

export async function deleteReviewComment(commentId: string, currentPath: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Необходима авторизация')
  console.warn('Таблица review_comments отсутствует в схеме Prisma.')
  revalidatePath(currentPath)
}

export async function reportComment(commentId: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Необходима авторизация')
  console.warn('Таблица comment_reports отсутствует в схеме Prisma.')
}