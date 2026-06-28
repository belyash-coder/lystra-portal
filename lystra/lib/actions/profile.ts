'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// 1. Получение пропуска для загрузки баннера
export async function getBannerUploadUrl(ext: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Необходима авторизация')

  const path = `${user.id}/${crypto.randomUUID()}.${ext}`
  const res = await supabase.storage.from('artist_media').createSignedUploadUrl(path)

  if (res.error) throw new Error(`Ошибка генерации ссылки: ${res.error.message}`)

  return { path, token: res.data.token }
}

// 2. Обновление профиля в БД
// 2. Обновление профиля в БД
export async function updateArtistProfile(bio: string, bannerPath?: string, socialLinks?: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Необходима авторизация')

  const updateData: any = { bio: bio.trim() }
  if (bannerPath) updateData.banner_path = bannerPath
  if (socialLinks) updateData.social_links = socialLinks

  const { error } = await supabase
    .from('artists')
    .update(updateData)
    .eq('id', user.id)

  if (error) throw new Error(`Ошибка сохранения профиля: ${error.message}`)

  revalidatePath('/studio')
  revalidatePath('/')
}
export async function deleteCurrentUser() {
  const supabase = await createClient()
  
  // Проверяем, авторизован ли пользователь
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Необходимо авторизоваться' }

  // Вызываем нашу RPC-функцию удаления аккаунта
  const { error } = await supabase.rpc('delete_current_user')
  
  if (error) {
    return { error: 'Не удалось удалить аккаунт: ' + error.message }
  }

  // Очищаем сессию на сервере (стираем куки)
  await supabase.auth.signOut()

  // Обновляем пути
  revalidatePath('/')
  return { success: true }
}