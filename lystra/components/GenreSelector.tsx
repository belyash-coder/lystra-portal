'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface GenreSelectorProps {
  profileId: string;
  initialGenres: string[];
  isEditable?: boolean;
}

export default function GenreSelector({ profileId, initialGenres, isEditable = false }: GenreSelectorProps) {
  const router = useRouter();

  const [genres, setGenres] = useState<string[]>(initialGenres);
  const [isAdding, setIsAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`/api/genres?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(data);
      } catch (err) {
        console.error('Ошибка поиска жанров:', err);
      }
    };

    const delayDebounceFn = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsAdding(false);
        setQuery('');
        setSuggestions([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateGenresInDb = async (newGenres: string[]) => {
    setGenres(newGenres);
    
    // ВАЖНО: Supabase удален. 
    // В будущем здесь нужно отправлять запрос на ваш новый API (например, fetch('/api/profile/genres', { method: 'POST', ... }))
    console.warn('Сохранение жанров в БД временно отключено (Supabase удален).');
    
    router.refresh(); 
  };

  const handleAddGenre = (genreName: string) => {
    if (!genres.includes(genreName)) {
      updateGenresInDb([...genres, genreName]);
    }
    setQuery('');
    setIsAdding(false);
    setSuggestions([]);
  };

  const handleRemoveGenre = (genreToRemove: string) => {
    updateGenresInDb(genres.filter((g) => g !== genreToRemove));
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="flex flex-wrap gap-2 items-center">
        
        {genres.map((genre) => (
          <span
            key={genre}
            className="h-[28px] px-3 text-xs font-semibold bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20 rounded-full flex items-center gap-1.5 transition-all hover:bg-[#a78bfa]/20 whitespace-nowrap"
          >
            {genre}
            {isEditable && (
              <button
                onClick={() => handleRemoveGenre(genre)}
                className="text-neutral-500 hover:text-red-400 font-bold text-sm leading-none transition-colors mt-[1px]"
              >
                &times;
              </button>
            )}
          </span>
        ))}

        {isEditable && (
          isAdding ? (
            <div className="relative flex-shrink-0">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск..."
                className="h-[28px] bg-[#121212] border border-neutral-800 rounded-full px-3 text-xs text-white focus:outline-none focus:border-[#a78bfa] w-32 md:w-40 transition-all"
              />
              
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 mt-1.5 w-52 bg-[#1a1a1a] border border-neutral-800 rounded-xl overflow-hidden shadow-2xl z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleAddGenre(suggestion)}
                      className="w-full text-left px-3 py-2 text-xs text-neutral-300 hover:bg-[#a78bfa]/10 hover:text-white transition-colors border-b border-neutral-900/50 last:border-0"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-[28px] h-[28px] flex-shrink-0 rounded-full border border-neutral-700 hover:border-[#a78bfa] text-neutral-400 hover:text-[#a78bfa] flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
              title="Добавить любимый жанр"
            >
              +
            </button>
          )
        )}
      </div>
    </div>
  );
}