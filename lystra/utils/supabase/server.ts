import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  // В Next.js 15 cookies() это промис, а в 14 - синхронная функция.
  // await спасает нас в обеих ситуациях.
  const cookieStore = await cookies()

  // Жесткая проверка ключей перед созданием клиента
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("🚨 КРИТИЧЕСКАЯ ОШИБКА: Ключи Supabase не найдены в .env.local")
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Игнорируем ошибки куки в Server Components
          }
        },
      },
    }
  )
}