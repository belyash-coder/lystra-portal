'use client';

import { useState, useRef } from 'react';
import { Dices, Disc3, RefreshCw, Music, ExternalLink } from 'lucide-react';
import CustomAudioPlayer from '@/components/CustomAudioPlayer';
import genresDataRaw from '@/data/genres.json';

// Твой JSON — это обычный массив строк
const genresData = genresDataRaw as string[];

// Просто перебираем его и делаем первую букву заглавной
const GENRES = genresData.map(
  (genre) => genre.charAt(0).toUpperCase() + genre.slice(1)
);

export default function DiscoverPage() {
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [tracks, setTracks] = useState<any[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const wheelRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null); // Реф для плавного скролла

  const TAPE_LENGTH = 40;
  const ITEM_HEIGHT = 100;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setHasResult(true);
    setSelectedGenre(searchQuery);
    setTracks([]);
    fetchExampleTracks(searchQuery);
  };

  const handleSpin = () => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    setHasResult(false);
    setTracks([]);
    
    if (wheelRef.current) {
      wheelRef.current.style.transition = 'none';
      wheelRef.current.style.transform = 'translateY(0)';
      
      const tape: string[] = [];
      for (let i = 0; i < TAPE_LENGTH; i++) {
        tape.push(GENRES[Math.floor(Math.random() * GENRES.length)]);
      }
      
      wheelRef.current.innerHTML = tape.map(g => 
        `<div class="h-[100px] flex items-center justify-center text-3xl font-black text-neutral-600 capitalize">${g}</div>`
      ).join('');

      const stopPosition = (TAPE_LENGTH - 1) * ITEM_HEIGHT;
      const finalGenre = tape[tape.length - 1];

      setTimeout(() => {
        if (wheelRef.current) {
          wheelRef.current.style.transition = 'transform 4.5s cubic-bezier(0.4, 0, 0.1, 1)';
          wheelRef.current.style.transform = `translateY(-${stopPosition}px)`;
        }
      }, 50);

      setTimeout(() => {
        setIsSpinning(false);
        setHasResult(true);
        setSelectedGenre(finalGenre);
        
        if (wheelRef.current?.lastElementChild) {
          wheelRef.current.lastElementChild.className = "h-[100px] flex items-center justify-center text-4xl font-black text-white capitalize [text-shadow:0_0_15px_rgba(52,211,153,0.6)] animate-pulse";
        }

        fetchExampleTracks(finalGenre);
      }, 4550);
    }
  };

  const fetchExampleTracks = async (genre: string) => {
    setIsLoadingTracks(true);
    try {
      // Отправляем запрос на наш защищенный роут 
      const res = await fetch(`/api/spotify-mix?genre=${encodeURIComponent(genre)}`);
      const data = await res.json();
      
      setTracks(data.tracks || []);
    } catch (error) {
      console.error("Ошибка загрузки треков:", error);
      setTracks([]);
    } finally {
      setIsLoadingTracks(false);
      // Даем React мгновение на отрисовку треков и плавно скроллим вниз
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  // Умный фоллбэк: пытаемся открыть приложение, если мы на компе (или нет приложухи) — открываем веб-версию
  const handleAppLaunch = (e: React.MouseEvent<HTMLAnchorElement>, appScheme: string, webFallback: string) => {
    e.preventDefault();
    window.location.href = appScheme;
    
    setTimeout(() => {
      window.open(webFallback, '_blank');
    }, 500);
  };

  return (
    <main className="min-h-screen bg-[#121212] text-white p-4 md:p-8 font-sans flex flex-col items-center overflow-x-hidden">
      <div className="max-w-3xl w-full space-y-8 md:space-y-12 mt-2 md:mt-8">
        
        <div className="text-center px-2">
          <h1 className="text-4xl md:text-5xl font-black mb-3 md:mb-4 leading-tight">
            Музыкальная <br className="block sm:hidden" /><span className="text-[#a78bfa]">рулетка</span>
          </h1>
          <p className="text-neutral-400 text-sm md:text-lg">
            Выйди за рамки привычного. Крути барабан и открывай новые жанры.
          </p>
        </div>

        {/* Быстрый поиск по жанрам для проверки релевантности */}
        <form onSubmit={handleSearchSubmit} className="mx-auto w-full max-w-md flex flex-col sm:flex-row gap-2 px-2 sm:px-0">
          <input
            type="text"
            placeholder="Жанр (например, Synthwave)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow bg-[#1a1a1a] border border-neutral-800 rounded-2xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-[#a78bfa] transition-colors text-sm md:text-base"
          />
          <button
            type="submit"
            className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-6 py-3 sm:py-0 rounded-2xl border border-neutral-700 transition-colors cursor-pointer w-full sm:w-auto"
          >
            Поиск
          </button>
        </form>

        <div className="bg-[#1a1a1a]/80 backdrop-blur-xl border border-neutral-800 rounded-[2rem] p-5 md:p-8 shadow-2xl mx-auto w-full max-w-md flex flex-col items-center">
          
          <div className="relative w-full h-[100px] overflow-hidden rounded-xl mb-8" 
               style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)' }}>
            
            
            <div ref={wheelRef} className="flex flex-col w-full will-change-transform">
              <div className="h-[100px] flex flex-col items-center justify-center text-neutral-500 gap-2">
                <span className="text-sm tracking-widest uppercase">Готов к открытиям?</span>
                <Dices className="w-8 h-8 text-[#34d399] animate-bounce" />
              </div>
            </div>
          </div>

          <button
            onClick={handleSpin}
            disabled={isSpinning}
            className="w-full bg-gradient-to-r from-[#a78bfa] to-[#34d399] text-[#121212] font-bold text-lg py-4 rounded-2xl hover:scale-105 hover:shadow-[0_0_30px_rgba(52,211,153,0.3)] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSpinning ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : hasResult ? (
              'Крутить еще раз'
            ) : (
              'Сгенерировать'
            )}
          </button>
        </div>

        {hasResult && (
          // Добавили ref и scroll-mt-8, чтобы при скролле сверху оставался красивый отступ
          <div ref={resultsRef} className="animate-in fade-in slide-in-from-bottom-8 duration-500 scroll-mt-8">
            {/* Блок со стримингами по центру МЕЖДУ рулеткой и треками */}
            <div className="flex flex-wrap justify-center gap-2 md:gap-3 w-full mb-8 md:mb-10 mt-4 md:mt-6 px-2">
              <a 
                href={['https://', 'open.', 'spotify.', 'com', '/search/', encodeURIComponent(selectedGenre)].join('')} 
                onClick={(e) => handleAppLaunch(e, `spotify:search:${encodeURIComponent(selectedGenre)}`, ['https://', 'open.', 'spotify.', 'com', '/search/', encodeURIComponent(selectedGenre)].join(''))}
                className="flex items-center gap-1.5 md:gap-2 px-4 py-2 md:px-6 md:py-2.5 bg-neutral-900/50 border border-neutral-800 rounded-full text-neutral-400 hover:text-white hover:border-[#1DB954] hover:shadow-[0_0_15px_rgba(29,185,84,0.2)] transition-all text-xs md:text-sm font-medium"
              >
                Spotify
              </a>
              <a 
                href={['https://', 'music.', 'yandex.', 'ru', '/search?text=', encodeURIComponent(selectedGenre)].join('')} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-1.5 md:gap-2 px-4 py-2 md:px-6 md:py-2.5 bg-neutral-900/50 border border-neutral-800 rounded-full text-neutral-400 hover:text-white hover:border-[#FFCC00] hover:shadow-[0_0_15px_rgba(255,204,0,0.2)] transition-all text-xs md:text-sm font-medium"
              >
                Яндекс Музыка
              </a>
              <a 
                href={['https://', 'music.', 'apple.', 'com', '/search?term=', encodeURIComponent(selectedGenre)].join('')} 
                onClick={(e) => handleAppLaunch(e, `music://music.apple.com/search?term=${encodeURIComponent(selectedGenre)}`, ['https://', 'music.', 'apple.', 'com', '/search?term=', encodeURIComponent(selectedGenre)].join(''))}
                className="flex items-center gap-1.5 md:gap-2 px-4 py-2 md:px-6 md:py-2.5 bg-neutral-900/50 border border-neutral-800 rounded-full text-neutral-400 hover:text-white hover:border-[#FA243C] hover:shadow-[0_0_15px_rgba(250,36,60,0.2)] transition-all text-xs md:text-sm font-medium"
              >
                Apple Music
              </a>
              <a 
                href={['https://', 'www.', 'deezer.', 'com', '/search/', encodeURIComponent(selectedGenre)].join('')} 
                onClick={(e) => handleAppLaunch(e, `deezer://www.deezer.com/search/${encodeURIComponent(selectedGenre)}`, ['https://', 'www.', 'deezer.', 'com', '/search/', encodeURIComponent(selectedGenre)].join(''))}
                className="flex items-center gap-1.5 md:gap-2 px-4 py-2 md:px-6 md:py-2.5 bg-neutral-900/50 border border-neutral-800 rounded-full text-neutral-400 hover:text-white hover:border-[#EF5466] hover:shadow-[0_0_15px_rgba(239,84,102,0.2)] transition-all text-xs md:text-sm font-medium"
              >
                Deezer
              </a>
            </div>

            {/* Заголовок Вайб Жанра теперь идет ровно над сеткой треков */}
            <h3 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-2 md:gap-3 px-2 md:px-0 flex-wrap">
              <Disc3 className="w-5 h-5 md:w-6 md:h-6 text-[#a78bfa] flex-shrink-0" />
              <span>Вайб жанра</span> <span className="text-[#34d399] capitalize truncate max-w-full">{selectedGenre}</span>
            </h3>

            {isLoadingTracks ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="w-8 h-8 text-[#34d399] animate-spin" />
              </div>
            ) : tracks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tracks.map((track) => (
                  <div key={track.id} className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 flex flex-col gap-3 hover:border-[#a78bfa]/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded overflow-hidden bg-neutral-800 flex-shrink-0">
                        {track.cover ? (
                          <img src={track.cover} alt="cover" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Music className="w-5 h-5 text-neutral-600" /></div>
                        )}
                      </div>
                      <div className="min-w-0 flex-grow">
                        <h4 className="font-bold text-white text-sm truncate">{track.title}</h4>
                        <p className="text-xs text-[#a78bfa] truncate">{track.artist}</p>
                      </div>
                    </div>
                    {/* Добавлен обязательный пропс trackId */}
                    <CustomAudioPlayer src={track.audio} initialDuration={30} trackId={track.id} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 text-center py-8 bg-neutral-900/30 rounded-2xl border border-neutral-800 border-dashed">
                К сожалению, мы не нашли ярких примеров этого жанра прямо сейчас. Попробуй крутануть еще раз!
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}