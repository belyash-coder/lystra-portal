'use client'

import { useState, useRef } from 'react'
import { getBannerUploadUrl, updateArtistProfile } from '@/lib/actions/profile'
import { Loader2, Save, Image as ImageIcon, CheckCircle, Edit2, X, Headphones, Music, Send, PlaySquare, Link2 } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

export default function ProfileForm({ artist }: { artist: any }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  
  const [bio, setBio] = useState(artist.bio || '')
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  
  // Состояние для ссылок
  const [links, setLinks] = useState(artist.social_links || {
    spotify: '', apple_music: '', telegram: '', vk: '', youtube: ''
  })
  
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const handleLinkChange = (network: string, value: string) => {
    setLinks((prev: any) => ({ ...prev, [network]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPending(true)
    setIsSuccess(false)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    try {
      let bannerPath: string | undefined

      if (bannerFile) {
        const ext = bannerFile.name.split('.').pop()
        if (ext) {
          const { path, token } = await getBannerUploadUrl(ext)
          const upload = await supabase.storage.from('artist_media').uploadToSignedUrl(path, token, bannerFile)
          if (upload.error) throw new Error('Ошибка загрузки баннера')
          bannerPath = path
          artist.banner_path = path 
        }
      }

      // Передаем links третьим параметром
      await updateArtistProfile(bio, bannerPath, links)
      
      artist.bio = bio 
      artist.social_links = links // Обновляем локально
      setIsSuccess(true)
      setBannerFile(null)
      
      setTimeout(() => {
        setIsSuccess(false)
        setIsEditing(false)
      }, 1500)

    } catch (err: any) {
      console.error(err)
      alert(err.message)
    } finally {
      setIsPending(false)
    }
  }

  const currentBannerUrl = bannerFile 
    ? URL.createObjectURL(bannerFile) 
    : artist.banner_path 
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artist_media/${artist.banner_path}`
      : null

  // --- РЕЖИМ ПРОСМОТРА ---
  if (!isEditing) {
    return (
      <div className="max-w-3xl bg-[#1a1a1a] border border-neutral-800 rounded-2xl overflow-hidden relative group">
        <button 
          onClick={() => setIsEditing(true)} 
          className="absolute top-4 right-4 z-10 bg-black/60 text-white px-4 py-2 text-sm rounded-xl backdrop-blur-md border border-white/10 hover:bg-[#a78bfa] hover:text-[#121212] transition-colors flex items-center gap-2 opacity-0 group-hover:opacity-100"
        >
          <Edit2 className="w-4 h-4" /> Редактировать профиль
        </button>

        <div className="h-48 md:h-64 bg-neutral-900 w-full relative">
          {artist.banner_path ? (
            <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artist_media/${artist.banner_path}`} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 bg-neutral-800/30">
              <ImageIcon className="w-10 h-10 mb-2 opacity-30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent"></div>
        </div>

        <div className="p-8 relative -mt-16">
          <div className="flex items-end justify-between mb-6">
            <div className="w-24 h-24 bg-[#121212] rounded-full flex items-center justify-center border-4 border-[#1a1a1a] text-3xl font-black text-[#a78bfa]">
              {artist.stage_name.charAt(0)}
            </div>
            
            {/* Блок ссылок в профиле */}
            <div className="flex gap-2">
              {artist.social_links?.spotify && (
                <a href={artist.social_links.spotify} target="_blank" rel="noreferrer" className="p-2.5 bg-neutral-800 hover:bg-[#34d399] hover:text-black rounded-full transition-colors text-white" title="Spotify">
                  <Headphones className="w-5 h-5" />
                </a>
              )}
              {artist.social_links?.apple_music && (
                <a href={artist.social_links.apple_music} target="_blank" rel="noreferrer" className="p-2.5 bg-neutral-800 hover:bg-[#a78bfa] hover:text-black rounded-full transition-colors text-white" title="Apple Music">
                  <Music className="w-5 h-5" />
                </a>
              )}
              {artist.social_links?.telegram && (
                <a href={artist.social_links.telegram} target="_blank" rel="noreferrer" className="p-2.5 bg-neutral-800 hover:bg-[#34d399] hover:text-black rounded-full transition-colors text-white" title="Telegram">
                  <Send className="w-5 h-5" />
                </a>
              )}
              {artist.social_links?.vk && (
                <a href={artist.social_links.vk} target="_blank" rel="noreferrer" className="p-2.5 bg-neutral-800 hover:bg-[#a78bfa] hover:text-black rounded-full transition-colors text-white" title="VK">
                  <Link2 className="w-5 h-5" />
                </a>
              )}
              {artist.social_links?.youtube && (
                <a href={artist.social_links.youtube} target="_blank" rel="noreferrer" className="p-2.5 bg-neutral-800 hover:bg-red-500 hover:text-white rounded-full transition-colors text-white" title="YouTube">
                  <PlaySquare className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          <h2 className="text-3xl font-black text-white mb-6">{artist.stage_name}</h2>
          
          {artist.bio ? (
            <p className="text-neutral-300 whitespace-pre-wrap leading-relaxed">{artist.bio}</p>
          ) : (
            <p className="text-neutral-500 italic">Биография пока не заполнена.</p>
          )}
        </div>
      </div>
    )
  }

  // --- РЕЖИМ РЕДАКТИРОВАНИЯ ---
  return (
    <form onSubmit={handleSubmit} className="max-w-3xl bg-[#1a1a1a] border border-neutral-800 rounded-2xl overflow-hidden">
      <div className="relative h-48 md:h-64 bg-neutral-900 group">
        {currentBannerUrl ? (
          <img src={currentBannerUrl} alt="Banner" className="w-full h-full object-cover opacity-80 group-hover:opacity-50 transition-opacity" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600">
            <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">Баннер не установлен</p>
          </div>
        )}
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <input type="file" accept="image/*" ref={bannerInputRef} className="hidden" onChange={(e) => setBannerFile(e.target.files?.[0] || null)} />
          <button type="button" onClick={() => bannerInputRef.current?.click()} className="bg-black/60 text-white px-4 py-2 rounded-lg font-medium backdrop-blur-sm border border-white/20 hover:bg-black/80 transition-colors">
            Изменить обложку
          </button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-2">Биография артиста</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="О вашем стиле, истории или планах..."
            className="w-full bg-[#121212] border border-neutral-800 rounded-xl p-4 text-white focus:outline-none focus:border-[#a78bfa] transition-colors resize-none"
          />
        </div>

        {/* Секция ссылок */}
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-4">Ссылки и соцсети (полный URL)</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center bg-[#121212] border border-neutral-800 rounded-xl overflow-hidden focus-within:border-[#34d399] transition-colors">
              <div className="p-3 text-neutral-500 bg-neutral-900"><Headphones className="w-5 h-5" /></div>
              <input type="url" value={links.spotify || ''} onChange={(e) => handleLinkChange('spotify', e.target.value)} placeholder="Ссылка на Spotify" className="w-full bg-transparent text-white p-3 text-sm focus:outline-none" />
            </div>
            <div className="flex items-center bg-[#121212] border border-neutral-800 rounded-xl overflow-hidden focus-within:border-[#a78bfa] transition-colors">
              <div className="p-3 text-neutral-500 bg-neutral-900"><Music className="w-5 h-5" /></div>
              <input type="url" value={links.apple_music || ''} onChange={(e) => handleLinkChange('apple_music', e.target.value)} placeholder="Ссылка на Apple Music" className="w-full bg-transparent text-white p-3 text-sm focus:outline-none" />
            </div>
            <div className="flex items-center bg-[#121212] border border-neutral-800 rounded-xl overflow-hidden focus-within:border-[#34d399] transition-colors">
              <div className="p-3 text-neutral-500 bg-neutral-900"><Send className="w-5 h-5" /></div>
              <input type="url" value={links.telegram || ''} onChange={(e) => handleLinkChange('telegram', e.target.value)} placeholder="Ссылка на Telegram" className="w-full bg-transparent text-white p-3 text-sm focus:outline-none" />
            </div>
            <div className="flex items-center bg-[#121212] border border-neutral-800 rounded-xl overflow-hidden focus-within:border-[#a78bfa] transition-colors">
              <div className="p-3 text-neutral-500 bg-neutral-900"><Link2 className="w-5 h-5" /></div>
              <input type="url" value={links.vk || ''} onChange={(e) => handleLinkChange('vk', e.target.value)} placeholder="Ссылка на VK" className="w-full bg-transparent text-white p-3 text-sm focus:outline-none" />
            </div>
            <div className="flex items-center bg-[#121212] border border-neutral-800 rounded-xl overflow-hidden focus-within:border-red-500 transition-colors md:col-span-2">
              <div className="p-3 text-neutral-500 bg-neutral-900"><PlaySquare className="w-5 h-5" /></div>
              <input type="url" value={links.youtube || ''} onChange={(e) => handleLinkChange('youtube', e.target.value)} placeholder="Ссылка на YouTube" className="w-full bg-transparent text-white p-3 text-sm focus:outline-none" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-800 pt-6">
          <button 
            type="button" 
            onClick={() => {
              setIsEditing(false);
              setBannerFile(null);
              setBio(artist.bio || '');
              setLinks(artist.social_links || { spotify: '', apple_music: '', telegram: '', vk: '', youtube: '' })
            }} 
            className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors px-4 py-2"
          >
            <X className="w-5 h-5" /> Отмена
          </button>

          <div className="flex items-center gap-4">
            {isSuccess && (
              <span className="flex items-center gap-2 text-[#34d399] text-sm font-medium animate-pulse">
                <CheckCircle className="w-4 h-4" /> Сохранено
              </span>
            )}
            <button type="submit" disabled={isPending} className="flex items-center gap-2 bg-[#a78bfa] text-[#121212] font-bold py-3 px-8 rounded-xl hover:bg-[#b8a1fa] transition-colors disabled:opacity-50">
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Сохранить</>}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}