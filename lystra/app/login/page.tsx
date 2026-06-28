import { login, signup } from './actions'

export default async function LoginPage(props: {
  searchParams: Promise<{ message?: string }>
}) {
  // В новых версиях Next.js searchParams нужно "дождаться" через await
  const searchParams = await props.searchParams

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-black/50 p-8 rounded-2xl border border-neutral-800">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Вход в LYSTRA
        </h1>
        
        {/* ДОБАВЛЕНО: Базовый action={login} для самой формы */}
        <form action={login} className="flex flex-col gap-4">
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

          {searchParams?.message && (
            <p className="text-red-400 text-sm text-center mt-2">
              {searchParams.message}
            </p>
          )}

          <div className="flex flex-col gap-3 mt-4">
            {/* Кнопка "Войти" теперь использует базовый action формы */}
            <button
              type="submit"
              className="w-full bg-[#34d399] text-black font-semibold py-3 rounded-lg hover:bg-[#2ebc89] transition-colors"
            >
              Войти
            </button>
            {/* А кнопка "Регистрация" переопределяет его через formAction */}
            <button
              formAction={signup}
              className="w-full bg-transparent border border-[#a78bfa] text-[#a78bfa] font-semibold py-3 rounded-lg hover:bg-[#a78bfa]/10 transition-colors"
            >
              Зарегистрироваться
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}