'use client'

import { useState, useRef } from 'react'
import { createPostRecord, updatePostRecord, deletePostRecord, getPostMediaUploadUrls } from '@/lib/actions/posts'
import { Send, Loader2, Image as ImageIcon, Music, Trash2, Edit2, X, Check } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import CustomAudioPlayer from '@/components/CustomAudioPlayer'

export default function PostFeed({ initialPosts, artist }: { initialPosts: any[], artist: any }) {
  // Локальное состояние для МОМЕНТАЛЬНОГО обновления ленты
  const [posts, setPosts] = useState(initialPosts)
  
  // Состояния формы
  const [isPending, setIsPending] = useState(false)
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  
  // Состояния редактирования
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  // Ссылки на скрытые инпуты файлов
  const imageInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)

  // 1. ПУБЛИКАЦИЯ
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() && !imageFile && !audioFile) return
    setIsPending(true)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    try {
      let imagePath: string | undefined
      let audioPath: string | undefined

      const imageExt = imageFile ? imageFile.name.split('.').pop() : undefined
      const audioExt = audioFile ? audioFile.name.split('.').pop() : undefined

      // 1. Запрашиваем "пропуска" на сервере
      let uploadUrls = null
      if (imageExt || audioExt) {
        uploadUrls = await getPostMediaUploadUrls(imageExt, audioExt)
      }

      // 2. Грузим картинку по пропуску
      if (imageFile && uploadUrls?.imageUpload) {
        const { path, token } = uploadUrls.imageUpload
        const upload = await supabase.storage.from('post_media').uploadToSignedUrl(path, token, imageFile)
        if (upload.error) throw new Error('Ошибка загрузки фото')
        imagePath = path
      }

      // 3. Грузим аудио по пропуску
      if (audioFile && uploadUrls?.audioUpload) {
        const { path, token } = uploadUrls.audioUpload
        const upload = await supabase.storage.from('post_media').uploadToSignedUrl(path, token, audioFile)
        if (upload.error) throw new Error('Ошибка загрузки демо')
        audioPath = path
      }

      // 4. Сохраняем в БД и получаем готовый пост
      const newPost = await createPostRecord(content, imagePath, audioPath)
      
      // МОМЕНТАЛЬНОЕ ДОБАВЛЕНИЕ В UI
      setPosts([newPost, ...posts])
      
      // Сброс формы
      setContent('')
      setImageFile(null)
      setAudioFile(null)
      if (imageInputRef.current) imageInputRef.current.value = ''
      if (audioInputRef.current) audioInputRef.current.value = ''

    } catch (err: any) {
      console.error(err)
      alert(err.message)
    } finally {
      setIsPending(false)
    }
  }

  // 2. УДАЛЕНИЕ
  const handleDelete = async (id: string, imagePath: string, audioPath: string) => {
    if (!confirm('Точно удалить этот пост?')) return
    
    // Моментально убираем из UI
    setPosts(posts.filter(p => p.id !== id))
    
    // Удаляем на сервере (в фоне)
    await deletePostRecord(id, imagePath, audioPath).catch(() => alert('Ошибка при удалении'))
  }

  // 3. РЕДАКТИРОВАНИЕ
  const handleEditSave = async (id: string) => {
    // Моментально обновляем UI
    setPosts(posts.map(p => p.id === id ? { ...p, content: editContent } : p))
    setEditingId(null)
    
    // Сохраняем на сервере
    await updatePostRecord(id, editContent).catch(() => alert('Ошибка при сохранении'))
  }

  return (
    <div className="max-w-3xl">
      {/* --- ФОРМА СОЗДАНИЯ --- */}
      <form onSubmit={handleSubmit} className="bg-[#1a1a1a] border border-neutral-800 p-5 rounded-2xl mb-8">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Что нового? (можно прикрепить фото или демо)"
          className="w-full bg-transparent text-white focus:outline-none resize-none mb-4"
        />
        
        {/* Предпросмотр файлов */}
        {(imageFile || audioFile) && (
          <div className="flex gap-4 mb-4 p-3 bg-neutral-900/50 rounded-xl border border-neutral-800">
            {imageFile && (
              <div className="flex items-center gap-2 text-sm text-[#34d399] bg-[#34d399]/10 px-3 py-1.5 rounded-lg">
                <ImageIcon className="w-4 h-4" /> {imageFile.name}
                <button type="button" onClick={() => setImageFile(null)}><X className="w-4 h-4 hover:text-white" /></button>
              </div>
            )}
            {audioFile && (
              <div className="flex items-center gap-2 text-sm text-[#a78bfa] bg-[#a78bfa]/10 px-3 py-1.5 rounded-lg">
                <Music className="w-4 h-4" /> {audioFile.name}
                <button type="button" onClick={() => setAudioFile(null)}><X className="w-4 h-4 hover:text-white" /></button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
          <div className="flex gap-2">
            <input type="file" accept="image/*" ref={imageInputRef} className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            <button type="button" onClick={() => imageInputRef.current?.click()} className="p-2 text-neutral-400 hover:text-[#34d399] hover:bg-neutral-800 rounded-lg transition-colors">
              <ImageIcon className="w-5 h-5" />
            </button>
            
            <input type="file" accept="audio/*" ref={audioInputRef} className="hidden" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
            <button type="button" onClick={() => audioInputRef.current?.click()} className="p-2 text-neutral-400 hover:text-[#a78bfa] hover:bg-neutral-800 rounded-lg transition-colors">
              <Music className="w-5 h-5" />
            </button>
          </div>
          
          <button type="submit" disabled={isPending || (!content && !imageFile && !audioFile)} className="flex items-center gap-2 bg-[#a78bfa] text-[#121212] font-bold py-2 px-6 rounded-xl hover:bg-[#b8a1fa] transition-colors disabled:opacity-50">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Опубликовать</>}
          </button>
        </div>
      </form>

      {/* --- ЛЕНТА ПОСТОВ --- */}
      <div className="space-y-6">
        {posts.map((post: any) => (
          <div key={post.id} className="bg-neutral-900/30 p-6 rounded-2xl border border-neutral-800/50 group">
            
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#a78bfa]/20 flex items-center justify-center text-[#a78bfa] font-bold border border-[#a78bfa]/30">
                  {artist.stage_name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-white">{artist.stage_name}</h4>
                  <p className="text-xs text-neutral-500">
                    {new Date(post.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              
              {/* Кнопки управления постом (Всегда видны на мобилках, появляются при наведении на ПК) */}
              <div className="flex opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity gap-2">
                <button onClick={() => { setEditingId(post.id); setEditContent(post.content) }} className="p-2 md:p-1.5 text-neutral-400 hover:text-white bg-neutral-800 rounded-lg md:rounded-md transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(post.id, post.image_path, post.audio_path)} className="p-2 md:p-1.5 text-neutral-400 hover:text-red-400 bg-neutral-800 rounded-lg md:rounded-md transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Контент (Режим редактирования или просмотра) */}
            {editingId === post.id ? (
              <div className="mb-4">
                <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} className="w-full bg-[#121212] border border-neutral-700 rounded-xl p-3 text-white focus:border-[#a78bfa] outline-none" />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleEditSave(post.id)} className="flex items-center gap-1 bg-[#34d399] text-black px-3 py-1 rounded-lg text-sm font-bold"><Check className="w-4 h-4"/> Сохранить</button>
                  <button onClick={() => setEditingId(null)} className="flex items-center gap-1 bg-neutral-800 text-white px-3 py-1 rounded-lg text-sm"><X className="w-4 h-4"/> Отмена</button>
                </div>
              </div>
            ) : (
              <p className="text-neutral-300 whitespace-pre-wrap leading-relaxed mb-4">
                {post.content}
              </p>
            )}

            {/* Медиа-вложения */}
            {post.image_path && (
              <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post_media/${post.image_path}`} alt="Вложение" className="rounded-xl w-full max-h-96 object-cover mb-4 border border-neutral-800" />
            )}
            
            {post.audio_path && (
              <div className="bg-[#121212] border border-neutral-800 p-3 rounded-xl w-full max-w-md mt-2">
                 <CustomAudioPlayer 
                   src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post_media/${post.audio_path}`} 
                   initialDuration={30} 
                 />
              </div>
            )}
          </div>
        ))}
        
        {posts.length === 0 && (
          <div className="text-center py-12 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20 text-neutral-500">
            У вас пока нет публикаций.
          </div>
        )}
      </div>
    </div>
  )
}