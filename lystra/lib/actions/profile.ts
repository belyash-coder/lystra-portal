'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// 1. Получение пропуска для загрузки баннера
export async function getBannerUploadUrl(ext: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Необходима авторизация')
  
  // Временно возвращаем заглушку. Для загрузки файлов потребуется 
  // настроить собственное S3 хранилище (MinIO/Coolify), так как Supabase Storage отключен.
  return { path: 'dummy_path', token: 'dummy_token' }
}

// 2. Обновление профиля
export async function updateArtistProfile(bio: string, bannerPath?: string, socialLinks?: any) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Необходима авторизация')

  // Обновляем био в нашей основной таблице profiles (студия и артисты удалены)
  await prisma.profiles.update({
    where: { id: session.user.id },
    data: { bio: bio.trim() }
  })

  revalidatePath('/studio')
  revalidatePath('/')
}

// 3. Удаление аккаунта
export async function deleteCurrentUser() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Необходимо авторизоваться' }

  try {
    // В Prisma каскадное удаление (onDelete: Cascade) само очистит связи, если они настроены
    await prisma.profiles.delete({
      where: { id: session.user.id }
    })
    
    // Куки сессии NextAuth очистятся на стороне клиента при вызове signOut() из UI
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    return { error: 'Не удалось удалить аккаунт: ' + error.message }
  }
}