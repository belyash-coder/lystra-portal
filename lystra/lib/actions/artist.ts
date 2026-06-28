'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createArtistProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) throw new Error('Необходима авторизация')

  const stageName = formData.get('stage_name') as string
  const bio = formData.get('bio') as string
  // Ссылки на соцсети можно собирать в JSON
  const instagram = formData.get('instagram') as string
  const telegram = formData.get('telegram') as string

  if (!stageName) {
    throw new Error('Сценическое имя обязательно')
  }

  const streaming_links = {
    ...(instagram && { instagram }),
    ...(telegram && { telegram })
  }

  // Записываем данные в новую таблицу artists
  const { error: dbError } = await supabase
    .from('artists')
    .insert({
      id: user.id, // Связываем с auth.users
      stage_name: stageName,
      bio: bio || null,
      streaming_links: streaming_links
    })

  if (dbError) {
    // Обработка ошибки уникальности (если профиль уже есть)
    if (dbError.code === '23505') throw new Error('Профиль артиста уже существует')
    throw new Error(`Ошибка создания профиля: ${dbError.message}`)
  }

  // Обновляем кэш и пускаем в полноценную Студию
  revalidatePath('/studio')
  redirect('/studio')
}