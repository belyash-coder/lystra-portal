"use client";

import { useState } from "react";
import Link from "next/link";

export default function GlobalReleasesGrid({ initialReleases }: { initialReleases: any[] }) {
  // Показываем изначально 10 карточек (2 ряда по 5 штук на больших мониторах)
  const [visibleCount, setVisibleCount] = useState(10); 

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 10);
  };

  const visibleReleases = initialReleases.slice(0, visibleCount);

  return (
    <div className="space-y-12">
      {/* Сетка стала шире: карточки крупнее, отступы (gap-8) больше */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-8">
        {visibleReleases.map((album: any) => (
          <Link 
            href={`/album/${album.id}`} 
            key={album.id} 
            className="group cursor-pointer block"
          >
            {/* Увеличили скругление и добавили тень для карточки */}
            <div className="relative aspect-square overflow-hidden rounded-xl mb-4 bg-neutral-900 shadow-lg">
              <img 
                src={album.cover_big || album.cover_medium} 
                alt={album.title} 
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            {/* Текст теперь крупнее (text-base вместо text-sm) */}
            <h3 
              className="font-bold text-base truncate group-hover:text-[#34d399] transition-colors" 
              title={album.title}
            >
              {album.title}
            </h3>
            <p 
              className="text-sm text-neutral-400 truncate mt-1 group-hover:text-[#a78bfa] transition-colors" 
              title={album.artist.name}
            >
              {album.artist.name}
            </p>
          </Link>
        ))}
        
        {initialReleases.length === 0 && (
          <p className="text-neutral-500 col-span-full text-center py-12">Не удалось загрузить релизы.</p>
        )}
      </div>

      {/* Кнопка "Загрузить еще" в нашей фирменной стилистике */}
      {visibleCount < initialReleases.length && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleLoadMore}
            className="px-8 py-3 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-300 font-bold hover:bg-neutral-800 hover:text-white hover:border-[#a78bfa] transition-all"
          >
            Загрузить еще
          </button>
        </div>
      )}
    </div>
  );
}