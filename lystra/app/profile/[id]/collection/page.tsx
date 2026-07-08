import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import Image from 'next/image';
import Link from 'next/link';
import { RemoveFromCollectionButton } from '@/components/RemoveFromCollectionButton';

// Отключаем кэширование, чтобы коллекция всегда была актуальной
export const revalidate = 0;

interface FavoriteAlbum {
  id: string;
  deezer_album_id: string | null;
  title: string;
  artist: string;
  cover_url: string | null;
}

export default async function FullCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const currentUser = session?.user;

  const resolvedParams = await params;
  const targetUsername = decodeURIComponent(resolvedParams.id);

  // Находим профиль по никнейму через Prisma
  const profile = await prisma.profiles.findFirst({
    where: { username: targetUsername },
    select: { id: true, username: true }
  });

  if (!profile) {
    return <div className="p-12 text-center text-white">Профиль не найден</div>;
  }

  const isOwner = currentUser?.id === profile.id;

  // Запрашиваем ВСЕ альбомы пользователя
  const collections = await prisma.collections.findMany({
    where: { 
      user_id: profile.id,
      item_type: 'album'
    },
    orderBy: { created_at: 'desc' }
  });

  // Подтягиваем данные обложкок и названий из Deezer
  const favoriteAlbums = await Promise.all(
    collections.map(async (item: any) => {
      try {
        const res = await fetch(`https://api.deezer.com/album/${item.item_id}`);
        if (!res.ok) return null;
        const albumData = await res.json();
        if (albumData.error) return null;
        return {
          id: item.id.toString(), // Безопасная конвертация для Next.js
          deezer_album_id: item.item_id,
          title: albumData.title,
          artist: albumData.artist?.name,
          cover_url: albumData.cover_medium,
        };
      } catch (err) {
        return null;
      }
    })
  ).then(results => results.filter(Boolean)) as FavoriteAlbum[];

  return (
    <div className="min-h-screen bg-[#121212] text-white p-4 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Навигация (кнопка назад) */}
        <div>
          <Link 
            href={`/profile/${profile.username || targetUsername}`} 
            className="inline-flex items-center gap-2 text-neutral-400 hover:text-[#34d399] transition-colors text-sm font-medium group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Назад в профиль
          </Link>
        </div>

        {/* Заголовок */}
        <div className="flex items-end gap-3 border-b border-white/10 pb-4">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <span className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-[#34d399]"></span>
            Коллекция релизов
          </h1>
          <span className="text-neutral-500 font-medium text-lg mb-0.5">({favoriteAlbums.length})</span>
        </div>

        {/* Сетка альбомов */}
        {favoriteAlbums.length === 0 ? (
          <div className="bg-white/5 border border-white/5 border-dashed p-12 rounded-xl text-center">
            <p className="text-gray-500">Коллекция пока пуста.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6 pt-4">
            {favoriteAlbums.map((album) => (
              <div key={album.id} className="group relative">
                {isOwner && album.deezer_album_id && (
                  <div className="absolute top-2 right-2 z-20">
                    <RemoveFromCollectionButton itemId={album.deezer_album_id} />
                  </div>
                )}
                <Link href={`/album/${album.deezer_album_id}`} className="block cursor-pointer">
                  <div className="aspect-square bg-neutral-800 rounded-xl overflow-hidden relative border border-white/5 group-hover:border-[#34d399]/50 transition-all duration-300 shadow-lg group-hover:shadow-[0_8px_20px_rgba(52,211,153,0.15)] z-10">
                    {album.cover_url ? (
                      <Image 
                        src={album.cover_url} 
                        alt={album.title} 
                        fill 
                        className="object-cover group-hover:scale-105 transition-transform duration-500" 
                        unoptimized 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">Нет обложки</div>
                    )}
                  </div>
                  <div className="mt-3">
                    <h3 className="text-xs md:text-sm font-bold text-white truncate group-hover:text-[#34d399] transition-colors">{album.title}</h3>
                    <p className="text-[10px] md:text-xs text-neutral-400 truncate">{album.artist}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}