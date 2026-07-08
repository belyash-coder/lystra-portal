"use client"

import Link from 'next/link'
import { useState, use } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage(props: {
  searchParams: Promise<{ message?: string; success?: string; next?: string }>
}) {
  const searchParams = use(props.searchParams)
  const nextUrl = searchParams?.next || '/'
  const router = useRouter()
  
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = formData.get('login')
    const password = formData.get('password')

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    })

    if (result?.error) {
      setError('Неверный email или пароль')
      setIsLoading(false)
    } else {
      router.push(nextUrl)
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-black/50 p-8 rounded-2xl border border-neutral-800">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Вход в LYSTRA
        </h1>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400" htmlFor="login">
              Email
            </label>
            <input
              id="login"
              name="login"
              type="email"
              placeholder="meloman@example.com"
              required
              disabled={isLoading}
              className="bg-[#121212] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#a78bfa] transition-colors disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400" htmlFor="password">
              Пароль
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              disabled={isLoading}
              className="bg-[#121212] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#a78bfa] transition-colors disabled:opacity-50"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center mt-2">
              {error}
            </p>
          )}
          
          {searchParams?.success && !error && (
            <div className="bg-[#34d399]/10 border border-[#34d399]/30 text-[#34d399] p-4 rounded-xl text-sm text-center mt-2 font-medium">
              {searchParams.success}
            </div>
          )}

          <div className="flex flex-col gap-3 mt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#34d399] text-black font-semibold py-3 rounded-lg hover:bg-[#2ebc89] transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Загрузка...' : 'Войти'}
            </button>
            <Link
              href={`/signup?next=${nextUrl}`}
              className="w-full text-center bg-transparent text-sm text-neutral-400 py-2 mt-2 hover:text-[#a78bfa] transition-colors block"
            >
              Создать аккаунт
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}