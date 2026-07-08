'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function toggleCollection(itemId: string, itemType: string, isAdded: boolean) {
  const session = await auth()
  const user = session?.user
  
  if (!user?.id) return { error: 'Необходимо авторизоваться' }

  try {
    if (isAdded) {
      // Удаляем из коллекции (используем deleteMany, так как ищем по составному ключу)
      await prisma.collections.deleteMany({
        where: { user_id: user.id, item_id: itemId, item_type: itemType }
      })
    } else {
      // Добавляем в коллекцию
      await prisma.collections.create({
        data: { user_id: user.id, item_id: itemId, item_type: itemType }
      })
    }

    revalidatePath(`/${itemType}/${itemId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}