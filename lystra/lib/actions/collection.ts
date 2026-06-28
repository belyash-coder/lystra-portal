'use server'

import { createClient } from '../supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleCollection(itemId: string, itemType: string, isAdded: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: 'Необходимо авторизоваться' }

  if (isAdded) {
    // Удаляем из коллекции
    const { error } = await supabase
      .from('collections')
      .delete()
      .match({ user_id: user.id, item_id: itemId, item_type: itemType })

    if (error) return { error: error.message }
  } else {
    // Добавляем в коллекцию
    const { error } = await supabase
      .from('collections')
      .insert({ user_id: user.id, item_id: itemId, item_type: itemType })

    if (error) return { error: error.message }
  }

  revalidatePath(`/${itemType}/${itemId}`)
  return { success: true }
}