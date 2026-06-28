"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Artist {
  id: number;
  name: string;
  picture_medium: string;
  nb_album?: number;
}

export default function ArtistSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Дебаунс: ждем 400мс после окончания ввода, чтобы не спамить запросами
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      const fetchArtists = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
          if (res.ok) {
            const data = await res.json();
            setResults(data.data?.slice(0, 8) || []); // Ограничимся топ-8 результатами
          }
        } catch (err) {
          console.error("Ошибка поиска:", err);
        } finally {
          setIsLoading(false);
        }
      };

      fetchArtists();
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Поисковая строка */}
      <div className="relative">
        <input
          type="text"
          placeholder="Поиск артистов на LYSTRA..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-neutral-900 text-white placeholder-neutral-500 pl-12 pr-4 py-3 rounded-xl border border-neutral-800 focus:outline-none focus:border-[#a78bfa] transition-colors font-sans text-base"
        />
        {/* Иконка лупы */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-[#34d399]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Результаты поиска */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-neutral-900/30 p-4 rounded-2xl border border-neutral-800/60">
          {results.map((artist) => (
            <Link
              href={`/artist/${artist.id}`}
              key={artist.id}
              className="group flex flex-col items-center text-center p-3 rounded-xl hover:bg-neutral-900/80 transition-all duration-200"
            >
              {/* Круглая аватарка с лавандовой рамкой при ховере */}
              <div className="w-24 h-24 rounded-full overflow-hidden mb-3 border-2 border-transparent group-hover:border-[#a78bfa] transition-all duration-200 shadow-lg">
                <img
                  src={artist.picture_medium}
                  alt={artist.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              
              {/* Имя артиста */}
              <h3 className="font-bold text-sm text-white truncate w-full group-hover:text-[#34d399] transition-colors">
                {artist.name}
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">Исполнитель</p>
            </Link>
          ))}
        </div>
      )}

      {/* Заглушка "Ничего не найдено" */}
      {query.trim().length >= 2 && results.length === 0 && !isLoading && (
        <p className="text-center text-neutral-500 text-sm">Исполнители не найдены. Попробуй другой запрос.</p>
      )}
    </div>
  );
}