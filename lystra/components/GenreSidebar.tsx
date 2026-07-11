"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Filter, X } from "lucide-react";

const GENRES = [
  "Electronic", "Rock", "Metal", "Alternative", "Hip-Hop/Rap", "Experimental",
  "Punk", "Folk", "Pop", "Ambient", "Soundtrack", "World", "Jazz", "Acoustic",
  "Funk", "R&B/Soul", "Devotional", "Classical", "Reggae", "Country", "Blues", "Latin"
];

export default function GenreSidebar({ 
  currentGenre, 
  basePath = "/releases" 
}: { 
  currentGenre?: string;
  basePath?: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Блокируем скролл фона, когда мобильное меню открыто
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; }
  }, [isOpen]);

  // Закрываем меню, если пользователь перевернул телефон или растянул окно до десктопа
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleGenreSelect = (genre: string) => {
    setIsOpen(false); // Прячем шторку после выбора
    if (currentGenre === genre) {
      router.push(basePath);
    } else {
      router.push(`${basePath}?genre=${encodeURIComponent(genre)}`);
    }
  };

  const handleReset = () => {
    setIsOpen(false);
    router.push(basePath);
  };

  return (
    <>
      {/* Кнопка вызова фильтров (Видна только на мобильных устройствах) */}
      <div className="md:hidden mb-4">
        <button
          onClick={() => setIsOpen(true)}
          className="w-fit flex items-center gap-4 bg-neutral-900/80 border border-neutral-700/80 px-5 py-3 rounded-2xl font-bold text-white transition-colors active:scale-[0.98] shadow-lg"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-[#a78bfa]" />
            <span>Фильтры</span>
          </div>
          {currentGenre && (
            <span className="text-xs font-black tracking-wider bg-[#a78bfa]/20 text-[#a78bfa] px-2 py-0.5 rounded-md">
              {currentGenre.toUpperCase()}
            </span>
          )}
        </button>
      </div>

      {/* Темный оверлей для фона (Клик по нему закрывает меню) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-[9998] md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Сам сайдбар (Шторка на мобильных, статический блок на десктопе) */}
      <div className={`
        fixed inset-y-0 left-0 z-[9999] w-[280px] bg-[#121212] border-r border-neutral-800 p-6 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col
        md:relative md:transform-none md:inset-auto md:w-full md:bg-neutral-900/40 md:border md:border-neutral-800/60 md:p-5 md:rounded-2xl md:shadow-lg md:z-auto
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        
        {/* Шапка мобильного меню с крестиком */}
        <div className="flex justify-between items-center mb-6 md:hidden flex-shrink-0">
          <h2 className="text-xl font-black text-white">Жанры</h2>
          <button onClick={() => setIsOpen(false)} className="p-2 -mr-2 text-neutral-400 hover:text-[#34d399] transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Скроллируемый список жанров */}
        <div className="flex flex-col gap-1.5 overflow-y-auto md:overflow-visible pb-8 md:pb-0 flex-grow [&::-webkit-scrollbar]:hidden">
          <button
            onClick={handleReset}
            className={`text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              !currentGenre
                ? "bg-[#34d399]/10 text-[#34d399] border border-[#34d399]/20"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white border border-transparent"
            }`}
          >
            Все релизы
          </button>

          {GENRES.map((genre) => {
            const isActive = currentGenre === genre;
            return (
              <button
                key={genre}
                onClick={() => handleGenreSelect(genre)}
                className={`text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? "bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-white border border-transparent"
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>

      </div>
    </>
  );
}