import BackButton from "@/components/BackButton";
import Image from "next/image";
import Link from "next/link";
import AlbumTrackList from "@/components/AlbumTrackList";
import CollapsibleSection from "@/components/CollapsibleSection";
import { AddToCollectionButton } from "@/components/AddToCollectionButton";
import { ReviewForm } from "@/components/ReviewForm";
import { createClient } from "@/lib/supabase/server";

// Базовые интерфейсы для типизации ответа Deezer
interface Track {
  id: number;
  title: string;
  duration: number;
  preview: string;
}

interface Album {
  id: number;
  title: string;
  cover_xl: string;
  release_date: string;
  artist: {
    id: number;
    name: string;
  };
  tracks: {
    data: Track[];
  };
  error?: {
    message: string;
  };
}

// Изменилась типизация params: теперь это Promise
export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  // Распаковываем Promise
  const resolvedParams = await params;
  const { id } = resolvedParams;

  // 1. Выполняем серверный запрос к Deezer
  const res = await fetch(`https://api.deezer.com/album/${id}`, {
    next: { revalidate: 3600 }
  });

  if (!res.ok) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center text-[#a78bfa]">
        <h2>Ошибка сети. Альбом не найден</h2>
      </div>
    );
  }

  const album: Album = await res.json();

  // Deezer может вернуть статус 200, но внутри написать ошибку (например, неверный ID)
  if (album.error || !album.artist) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center text-red-400">
        <h2>Ошибка Deezer: Альбом не найден или удален</h2>
      </div>
    );
  }

  // 2. Проверяем, есть ли этот альбом в коллекции текущего пользователя
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let isAddedToCollection = false;

  if (user) {
    const { data } = await supabase
      .from('collections')
      .select('id')
      .match({ user_id: user.id, item_id: id, item_type: 'album' })
      .maybeSingle(); // maybeSingle не выдаст ошибку, если запись не найдена

    if (data) {
      isAddedToCollection = true;
    }
  }

  // 3. Запрашиваем дополнительные данные для сайдбара
  let artistAlbums = [];
  let relatedArtists = [];
  try {
    // Делаем параллельные запросы для ускорения загрузки
    const [albumsRes, relatedRes] = await Promise.all([
      fetch(`https://api.deezer.com/artist/${album.artist.id}/albums?limit=6`, { next: { revalidate: 3600 } }),
      fetch(`https://api.deezer.com/artist/${album.artist.id}/related?limit=5`, { next: { revalidate: 3600 } })
    ]);
    
    const albumsData = await albumsRes.json();
    const relatedData = await relatedRes.json();
    
    // Исключаем текущий альбом из списка "других релизов"
    artistAlbums = albumsData.data?.filter((a: any) => a.id !== Number(id)).slice(0, 4) || [];
    relatedArtists = relatedData.data?.slice(0, 5) || [];
  } catch (error) {
    console.error("Ошибка загрузки сайдбара:", error);
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 md:p-12">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-8 flex flex-col gap-4 items-start">
          <Link 
            href="/global-releases" 
            className="text-[#a78bfa] hover:text-white transition-all text-sm font-bold flex items-center gap-2 bg-[#a78bfa]/10 hover:bg-[#a78bfa]/20 px-4 py-2 rounded-xl border border-[#a78bfa]/20 shadow-lg w-fit"
          >
            ← К списку релизов
          </Link>
          <BackButton />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-16">
          
          {/* Левая колонка (Основной контент) */}
          <div className="lg:col-span-2">
            
            {/* Шапка альбома */}
      <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-end mb-12">
        <Image
          src={album.cover_xl}
          alt={album.title}
          width={260}
          height={260}
          className="rounded-2xl shadow-2xl shadow-[#a78bfa]/20 flex-shrink-0"
          unoptimized
          priority
        />
        <div className="text-center md:text-left flex flex-col items-center md:items-start w-full min-w-0">
          <p className="text-sm text-gray-400 uppercase tracking-widest mb-2 font-bold">Альбом</p>
          <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight line-clamp-2 w-full pb-1" title={album.title}>
            {album.title}
          </h1>
          <div className="flex items-center justify-center md:justify-start gap-2 text-lg mb-6">
            <Link href={`/artist/${album.artist.id}`} className="text-[#34d399] hover:underline">
              {album.artist.name}
            </Link>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400">{album.release_date?.substring(0, 4)}</span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
            {/* Кнопка добавления в коллекцию */}
            <AddToCollectionButton 
              itemId={id} 
              itemType="album" 
              initialAdded={isAddedToCollection} 
            />
            
            {/* Якорная ссылка к рецензиям (Скрыта на мобильных) */}
            <a 
              href="#reviews"
              className="hidden md:flex items-center justify-center px-6 py-2.5 rounded-full border border-neutral-700 bg-neutral-900/50 font-bold text-neutral-400 hover:text-white hover:border-[#34d399] transition-all"
            >
              К рецензиям ↓
            </a>
          </div>
        </div>
      </div>

      {/* Список треков с плеером */}
          <AlbumTrackList tracks={album.tracks?.data || []} />

      {/* Форма написания рецензии */}
          <div className="w-full scroll-mt-32" id="reviews">
            <CollapsibleSection title="Рецензии">
              <ReviewForm 
                itemId={id} 
                itemType="album" 
                itemTitle={album.title} 
                itemArtist={album.artist.name} 
                itemCover={album.cover_xl} 
              />
            </CollapsibleSection>
          </div>
        </div> {/* Закрываем левую колонку */}

          {/* Правая колонка (Сайдбар) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-12">
              
              {/* Блок 1: Другие релизы */}
              {artistAlbums.length > 0 && (
                <CollapsibleSection title="Еще от автора">
                  <div className="space-y-4">
                    {artistAlbums.map((a: any) => (
                      <Link href={`/album/${a.id}`} key={a.id} className="flex items-center gap-4 group">
                        <img 
                          src={a.cover_small || a.cover_medium} 
                          alt={a.title} 
                          className="w-14 h-14 rounded-lg bg-neutral-900 object-cover group-hover:opacity-80 transition-opacity flex-shrink-0" 
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate group-hover:text-[#34d399] transition-colors">{a.title}</p>
                          <p className="text-xs text-neutral-500 mt-1">{a.release_date?.substring(0, 4)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Блок 2: Похожие артисты */}
              {relatedArtists.length > 0 && (
                <CollapsibleSection title="Похожие артисты">
                  <div className="space-y-4">
                    {relatedArtists.map((artist: any) => (
                      <Link href={`/artist/${artist.id}`} key={artist.id} className="flex items-center gap-4 group">
                        <img 
                          src={artist.picture_small || artist.picture_medium} 
                          alt={artist.name} 
                          className="w-14 h-14 rounded-full bg-neutral-900 object-cover group-hover:opacity-80 transition-opacity flex-shrink-0" 
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate group-hover:text-[#a78bfa] transition-colors">{artist.name}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

            </div>
          </div>
          
        </div> {/* Закрываем сетку */}
      </div> {/* Закрываем max-w-[1200px] */}
    </div>
  );
}