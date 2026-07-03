'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  let errorMessage = ''
  // Жесткий редирект на главную, чтобы избежать 404 ошибок несуществующих страниц
  const nextUrl = '/' 
  
  try {
    const supabase = await createClient()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) errorMessage = error.message || JSON.stringify(error)
  } catch (err: any) {
    errorMessage = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err)) || "Неизвестная ошибка сервера"
    if (errorMessage === '{}') errorMessage = "Скрытая ошибка БД"
  }

  if (errorMessage) {
    redirect(`/login?message=${encodeURIComponent(errorMessage)}&next=${encodeURIComponent(nextUrl)}`)
  }

  revalidatePath('/', 'layout')
  redirect(nextUrl)
}

export async function signup(formData: FormData) {
  let errorMessage = ''
  const nextUrl = '/' 
  
  try {
    const supabase = await createClient()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signUp({ email, password })
    if (error) errorMessage = error.message || JSON.stringify(error)
  } catch (err: any) {
    errorMessage = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err)) || "Неизвестная ошибка сервера"
    if (errorMessage === '{}') errorMessage = "Ошибка: проверьте SQL-триггер на создание профиля"
  }

  if (errorMessage) {
    redirect(`/login?message=${encodeURIComponent(errorMessage)}&next=${encodeURIComponent(nextUrl)}`)
  }

  // Успешно — кидаем обратно на страницу входа с параметром success
  redirect(`/login?success=${encodeURIComponent('Письмо с ссылкой для подтверждения отправлено на вашу почту. Пожалуйста, проверьте также папку "Спам".')}&next=${encodeURIComponent(nextUrl)}`)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  // Обновляем весь кэш приложения (layout), чтобы шапка сразу "забыла" пользователя
  revalidatePath('/', 'layout') 
}