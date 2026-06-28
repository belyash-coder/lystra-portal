import BackButton from "@/components/BackButton";
import Image from "next/image";
import Link from "next/link";
import CustomAudioPlayer from "@/components/CustomAudioPlayer";
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

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 md:p-12">
      <div className="mb-6">
        <BackButton />
      </div>
      
      {/* Шапка альбома */}
      <div className="flex flex-col md:flex-row gap-8 items-center md:items-end mb-12">
        <Image
          src={album.cover_xl}
          alt={album.title}
          width={300}
          height={300}
          className="rounded-2xl shadow-2xl shadow-[#a78bfa]/20"
          unoptimized
          priority
        />
        <div className="text-center md:text-left flex flex-col items-center md:items-start">
          <p className="text-sm text-gray-400 uppercase tracking-widest mb-2">Альбом</p>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">{album.title}</h1>
          <div className="flex items-center justify-center md:justify-start gap-2 text-lg mb-6">
            <Link href={`/artist/${album.artist.id}`} className="text-[#34d399] hover:underline">
              {album.artist.name}
            </Link>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400">{album.release_date.substring(0, 4)}</span>
          </div>
          
          {/* Кнопка добавления в коллекцию */}
          <AddToCollectionButton 
            itemId={id} 
            itemType="album" 
            initialAdded={isAddedToCollection} 
          />
        </div>
      </div>

      {/* Список треков с плеером */}
<div className="max-w-4xl mb-16">
  <div className="grid grid-cols-[auto_1fr_auto] gap-4 text-gray-400 border-b border-gray-800 pb-2 mb-4 px-4">
    <span>#</span>
    <span>Название</span>
    <span>Превью</span>
  </div>

  <ul className="flex flex-col gap-2">
    {album.tracks?.data.map((track, index) => (
      <li 
        key={track.id} 
        className="grid grid-cols-[auto_1fr_auto] gap-4 items-center p-4 hover:bg-white/5 rounded-lg transition-colors group"
      >
        <span className="w-6 text-right text-gray-500">{index + 1}</span>
        <span className="font-medium truncate group-hover:text-[#a78bfa] transition-colors">
          {track.title}
        </span>
        
        {/* Кастомный плеер LYSTRA */}
        {track.preview ? (
          /* Добавили initialDuration={30} */
          <CustomAudioPlayer src={track.preview} initialDuration={30} />
        ) : (
          <span className="text-gray-600 text-sm italic">Превью недоступно</span>
        )}
      </li>
    ))}
  </ul>
</div>

      {/* Форма написания рецензии */}
<div className="max-w-4xl">
  <h2 className="text-2xl font-bold mb-6 text-[#34d399]">Рецензии</h2>
  <ReviewForm 
    itemId={id} 
    itemType="album" 
    itemTitle={album.title} 
    itemArtist={album.artist.name} 
    itemCover={album.cover_xl} 
  />
</div>
    </div>
  );
}