'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  let errorMessage = ''
  
  try {
    const supabase = await createClient()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) errorMessage = error.message
  } catch (err: any) {
    // Если падает сам сервер (например, неверные ключи или версия Next.js)
    errorMessage = err.message || "Неизвестная ошибка сервера"
  }

  // Делаем редирект ВНЕ блока try-catch, чтобы не сломать Next.js
  if (errorMessage) {
    redirect(`/login?message=${encodeURIComponent(errorMessage)}`)
  }

  revalidatePath('/')
  redirect('/')
}

export async function signup(formData: FormData) {
  let errorMessage = ''
  
  try {
    const supabase = await createClient()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signUp({ email, password })
    if (error) errorMessage = error.message
  } catch (err: any) {
    errorMessage = err.message || "Неизвестная ошибка сервера"
  }

  if (errorMessage) {
    redirect(`/login?message=${encodeURIComponent(errorMessage)}`)
  }

  revalidatePath('/')
  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
  redirect('/login')
}