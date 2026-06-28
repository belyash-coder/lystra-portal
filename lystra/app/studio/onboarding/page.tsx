'use client'

import { useState } from 'react'
import { createArtistProfile } from '@/lib/actions/artist'
import { Mic2, Loader2, AtSign, Send } from 'lucide-react'
export default function ArtistOnboardingPage() {
  const [isPending, setIsPending] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    setErrorText(null)

    try {
      const formData = new FormData(e.currentTarget)
      await createArtistProfile(formData)
      // В случае успеха Server Action сам сделает redirect('/studio')
    } catch (err: any) {
      setErrorText(err.message)
      setIsPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#1a1a1a] p-8 md:p-12 rounded-3xl border border-neutral-800 shadow-2xl">
        
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-[#a78bfa]/10 rounded-2xl flex items-center justify-center border border-[#a78bfa]/20">
            <Mic2 className="w-8 h-8 text-[#a78bfa]" />
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3">Добро пожаловать в Студию</h1>
          <p className="text-neutral-400">
            LYSTRA — это место для независимой музыки. Создай карточку артиста, чтобы начать публиковать свои релизы.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Сценическое имя */}
          <div>
            <label htmlFor="stage_name" className="block text-sm font-bold text-neutral-300 mb-2">
              Сценическое имя / Название группы <span className="text-[#34d399]">*</span>
            </label>
            <input 
              type="text" 
              id="stage_name" 
              name="stage_name" 
              required 
              placeholder="Например: Daft Punk"
              className="w-full bg-[#121212] border border-neutral-700 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#a78bfa] focus:ring-1 focus:ring-[#a78bfa] transition-colors"
            />
          </div>

          {/* Биография */}
          <div>
            <label htmlFor="bio" className="block text-sm font-bold text-neutral-300 mb-2">
              Биография (необязательно)
            </label>
            <textarea 
              id="bio" 
              name="bio" 
              rows={4}
              placeholder="Пару слов о вашем стиле, истории создания или философии проекта..."
              className="w-full bg-[#121212] border border-neutral-700 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#a78bfa] focus:ring-1 focus:ring-[#a78bfa] transition-colors resize-none"
            />
          </div>

          {/* Соцсети */}
          <div className="space-y-4 pt-4 border-t border-neutral-800">
            <h3 className="text-sm font-bold text-neutral-300">Ссылки (необязательно)</h3>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
  <AtSign className="w-5 h-5 text-neutral-500" />
</div>
              <input 
                type="text" 
                name="instagram" 
                placeholder="Ссылка на Instagram"
                className="w-full bg-[#121212] border border-neutral-700 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-[#a78bfa] transition-colors"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Send className="w-5 h-5 text-neutral-500" />
              </div>
              <input 
                type="text" 
                name="telegram" 
                placeholder="Ссылка на Telegram-канал"
                className="w-full bg-[#121212] border border-neutral-700 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-[#a78bfa] transition-colors"
              />
            </div>
          </div>

          {errorText && (
            <div className="p-4 rounded-xl bg-red-900/30 border border-red-500/50 text-red-200 text-sm text-center">
              {errorText}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 bg-[#a78bfa] text-[#121212] font-bold text-lg py-4 px-8 rounded-xl hover:bg-[#b8a1fa] transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Создать профиль артиста'}
          </button>
        </form>
      </div>
    </div>
  )
}