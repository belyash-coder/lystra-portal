'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  let errorMessage = ''
  const nextUrl = '/' 
  
  try {
    const supabase = await createClient()
    const loginInput = formData.get('login') as string
    const password = formData.get('password') as string

    let email = loginInput

    // Если в строке нет '@', считаем, что это юзернейм, и запрашиваем email через нашу SQL-функцию
    if (!loginInput.includes('@')) {
      const { data, error: rpcError } = await supabase
        .rpc('get_email_by_username', { p_username: loginInput })
      
      if (rpcError || !data) {
        throw new Error('Пользователь с таким юзернеймом не найден')
      }
      email = data
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) errorMessage = error.message || JSON.stringify(error)
  } catch (err: any) {
    errorMessage = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err)) || "Неизвестная ошибка сервера"
    if (errorMessage === '{}') errorMessage = "Скрытая ошибка БД"
  }

  if (errorMessage) {
    redirect(`/signup?message=${encodeURIComponent(errorMessage)}&next=${encodeURIComponent(nextUrl)}`)
  }

  revalidatePath('/', 'layout')
  redirect(nextUrl)
}

export async function signup(formData: FormData) {
  let errorMessage = ''
  const nextUrl = '/' 
  
  try {
    const supabase = await createClient()
    const username = formData.get('username') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      errorMessage = 'Пароли не совпадают'
    } else {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { username }
        }
      })
      if (error) errorMessage = error.message || JSON.stringify(error)
    }
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