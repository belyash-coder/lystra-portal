import Link from 'next/link'
import { signup } from '../login/actions'

export default async function SignupPage(props: {
  searchParams: Promise<{ message?: string; next?: string }>
}) {
  const searchParams = await props.searchParams
  const nextUrl = searchParams?.next || '/'

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-black/50 p-8 rounded-2xl border border-neutral-800">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Создание аккаунта
        </h1>
        
        <form action={signup} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={nextUrl} />

          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400" htmlFor="username">
              Имя пользователя
            </label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="meloman"
              required
              className="bg-[#121212] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#a78bfa] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="meloman@example.com"
              required
              className="bg-[#121212] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#a78bfa] transition-colors"
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
              className="bg-[#121212] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#a78bfa] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400" htmlFor="confirmPassword">
              Подтвердите пароль
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              required
              className="bg-[#121212] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#a78bfa] transition-colors"
            />
          </div>

          {searchParams?.message && (
            <p className="text-red-400 text-sm text-center mt-2">
              {searchParams.message}
            </p>
          )}

          <div className="flex flex-col gap-3 mt-4">
            <button
              type="submit"
              className="w-full bg-[#34d399] text-black font-semibold py-3 rounded-lg hover:bg-[#2ebc89] transition-colors"
            >
              Зарегистрироваться
            </button>
            
            <Link
              href={`/login?next=${nextUrl}`}
              className="w-full text-center bg-transparent text-sm text-neutral-400 py-2 mt-2 hover:text-[#a78bfa] transition-colors block"
            >
              Уже есть аккаунт? Войти
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}