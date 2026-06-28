'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getReleaseUploadUrls } from '@/lib/actions/releases'
import { UploadCloud, Image as ImageIcon, Music, Loader2, Plus, X } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import ReleaseGenreSelect from '@/components/ReleaseGenreSelect'

// Вспомогательная функция для длительности
const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const audio = new Audio(URL.createObjectURL(file))
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src)
      resolve(Math.round(audio.duration))
    }
  })
}

export default function NewReleasePage() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [tracks, setTracks] = useState<{ id: string, file: File, title: string, duration: number }[]>([])
  
  // Стейт для хранения выбранного жанра
  const [genre, setGenre] = useState('')

  const handleAudioSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const newFiles = Array.from(e.target.files)
    
    const processedTracks = await Promise.all(newFiles.map(async (file) => {
      const duration = await getAudioDuration(file)
      // Убираем расширение из названия файла по умолчанию
      const defaultTitle = file.name.replace(/\.[^/.]+$/, "") 
      return { id: crypto.randomUUID(), file, title: defaultTitle, duration }
    }))

    setTracks(prev => [...prev, ...processedTracks])
  }

  const removeTrack = (id: string) => {
    setTracks(prev => prev.filter(t => t.id !== id))
  }

  const updateTrackTitle = (id: string, newTitle: string) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, title: newTitle } : t))
  }

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    setErrorText(null)

    try {
      const formData = new FormData(e.currentTarget)
      const title = formData.get('title') as string
      const releaseType = formData.get('release_type') as string

      if (!genre) throw new Error('Пожалуйста, выберите жанр')
      if (!coverFile) throw new Error('Пожалуйста, добавьте обложку релиза')
      if (tracks.length === 0) throw new Error('Добавьте хотя бы один аудиофайл')
      
      if (releaseType === 'single' && tracks.length > 1) {
        throw new Error('Для формата "Сингл" можно загрузить только один трек. Выберите EP или Альбом.')
      }

      // 1. Получаем токены с сервера
      const coverExt = coverFile.name.split('.').pop() || 'jpg'
      const trackExts = tracks.map(t => t.file.name.split('.').pop() || 'mp3')
      const urls = await getReleaseUploadUrls(coverExt, trackExts)

      // Инициализируем клиент Supabase прямо здесь
      const supabase = createClient()

      // 2. Грузим обложку (Клиент -> Storage)
      const coverUpload = await supabase.storage.from('release_covers').uploadToSignedUrl(urls.cover.path, urls.cover.token, coverFile)
      if (coverUpload.error) throw new Error('Ошибка загрузки обложки')

      // 3. Грузим аудиофайлы параллельно (Клиент -> Storage)
      const trackUploads = await Promise.all(tracks.map((track, i) => 
        supabase.storage.from('audio_files').uploadToSignedUrl(urls.tracks[i].path, urls.tracks[i].token, track.file)
      ))
      
      const failedUpload = trackUploads.find(u => u.error)
      if (failedUpload) throw new Error('Ошибка загрузки одного из аудиофайлов')

      // 4. ПИШЕМ В БАЗУ НАПРЯМУЮ С КЛИЕНТА (Обходим таймаут Next.js)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Сессия истекла, пожалуйста, авторизуйтесь заново')

      // Сохраняем релиз
      const { data: release, error: releaseError } = await supabase
        .from('releases')
        .insert({
          artist_id: user.id,
          title,
          genre,
          release_type: releaseType,
          cover_path: urls.cover.path
        })
        .select('id')
        .single()

      if (releaseError) throw new Error(`Ошибка БД (релиз): ${releaseError.message}`)

      // Сохраняем треки
      const tracksToInsert = tracks.map((track, i) => ({
        release_id: release.id,
        title: track.title,
        audio_path: urls.tracks[i].path,
        duration: track.duration,
        track_number: i + 1
      }))

      const { error: tracksError } = await supabase.from('tracks').insert(tracksToInsert)
      if (tracksError) throw new Error(`Ошибка БД (треки): ${tracksError.message}`)

      // Успех! Уходим в дашборд
      router.push('/studio')
      router.refresh()

    } catch (err: any) {
      setErrorText(err.message)
      setIsPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8 md:p-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Новый релиз</h1>
        <p className="text-neutral-400 mb-10">Соберите свой Сингл, EP или Альбом.</p>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Основная мета-информация */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Название релиза</label>
                <input type="text" name="title" required className="w-full bg-[#1a1a1a] border border-neutral-700 rounded-xl px-4 py-3 text-white focus:border-[#a78bfa] focus:ring-1 focus:ring-[#a78bfa] transition-colors outline-none" placeholder="Например: Random Access Memories" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Тип</label>
                  <select name="release_type" required defaultValue="" className="w-full bg-[#1a1a1a] border border-neutral-700 rounded-xl px-4 py-3 text-white focus:border-[#34d399] transition-colors outline-none appearance-none">
                    <option value="" disabled>Формат...</option>
                    <option value="single">Сингл (1 трек)</option>
                    <option value="ep">EP (2-5 треков)</option>
                    <option value="album">Альбом</option>
                  </select>
                </div>
                
                {/* Компонент выбора жанра */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Жанр</label>
                  <ReleaseGenreSelect 
                    value={genre} 
                    onChange={setGenre} 
                  />
                </div>
                
              </div>
            </div>

            {/* Обложка */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Обложка</label>
              <div className="relative aspect-square border-2 border-dashed border-neutral-700 rounded-xl bg-[#1a1a1a] hover:border-[#a78bfa] transition-colors flex flex-col items-center justify-center overflow-hidden group">
                <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                {coverFile ? (
                  <img src={URL.createObjectURL(coverFile)} alt="Cover preview" className="object-cover w-full h-full" />
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-neutral-500 mb-2 group-hover:text-[#a78bfa] transition-colors" />
                    <span className="text-xs text-neutral-500">Загрузить фото</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <hr className="border-neutral-800" />

          {/* Треклист */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Треклист</h3>
              <div className="relative">
                <input type="file" accept="audio/*" multiple onChange={handleAudioSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <button type="button" className="flex items-center gap-2 bg-[#1a1a1a] border border-neutral-700 hover:border-[#34d399] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  <Plus className="w-4 h-4 text-[#34d399]" />
                  Добавить аудио
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {tracks.length === 0 && (
                <div className="py-8 text-center border border-dashed border-neutral-800 rounded-xl bg-[#1a1a1a]/50 text-neutral-500">
                  <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Выберите один или несколько аудиофайлов
                </div>
              )}
              
              {tracks.map((track, index) => (
                <div key={track.id} className="flex items-center gap-4 bg-[#1a1a1a] p-3 rounded-xl border border-neutral-800">
                  <div className="text-neutral-500 font-mono text-sm w-6 text-center">{index + 1}</div>
                  <input 
                    type="text" 
                    value={track.title} 
                    onChange={(e) => updateTrackTitle(track.id, e.target.value)}
                    className="flex-grow bg-transparent border-b border-transparent focus:border-[#a78bfa] text-white outline-none py-1 transition-colors"
                  />
                  <div className="text-neutral-500 font-mono text-sm">
                    {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                  </div>
                  <button type="button" onClick={() => removeTrack(track.id)} className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors text-neutral-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {errorText && (
            <div className="p-4 rounded-xl bg-red-900/30 border border-red-500/50 text-red-200 text-sm text-center">
              {errorText}
            </div>
          )}

          <button type="submit" disabled={isPending} className="w-full flex items-center justify-center gap-2 bg-[#a78bfa] text-[#121212] font-bold text-lg py-4 px-8 rounded-xl hover:bg-[#b8a1fa] transition-colors disabled:opacity-50">
            {isPending ? <><Loader2 className="w-6 h-6 animate-spin" /> Загружаем релиз...</> : <><UploadCloud className="w-6 h-6" /> Опубликовать</>}
          </button>
        </form>
      </div>
    </div>
  )
}