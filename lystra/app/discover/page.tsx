'use client';

import { useState, useRef } from 'react';
import { Dices, Disc3, RefreshCw, Music } from 'lucide-react';
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
  
  const wheelRef = useRef<HTMLDivElement>(null);

  const TAPE_LENGTH = 40;
  const ITEM_HEIGHT = 100;

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
      // Отправляем запрос на наш защищенный роут Spotify
      const res = await fetch(`/api/spotify-mix?genre=${encodeURIComponent(genre)}`);
      const data = await res.json();
      
      setTracks(data.tracks || []);
    } catch (error) {
      console.error("Ошибка загрузки треков:", error);
      setTracks([]);
    } finally {
      setIsLoadingTracks(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#121212] text-white p-8 font-sans flex flex-col items-center">
      <div className="max-w-3xl w-full space-y-12 mt-8">
        
        <div className="text-center">
          <h1 className="text-5xl font-black mb-4">
            Музыкальная <span className="text-[#a78bfa]">рулетка</span>
          </h1>
          <p className="text-neutral-400 text-lg">
            Выйди за рамки привычного. Крути барабан и открывай новые жанры.
          </p>
        </div>

        <div className="bg-[#1a1a1a]/80 backdrop-blur-xl border border-neutral-800 rounded-3xl p-8 shadow-2xl mx-auto w-full max-w-md flex flex-col items-center">
          
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
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Disc3 className="w-6 h-6 text-[#a78bfa]" />
              Вайб жанра <span className="text-[#34d399] capitalize">{selectedGenre}</span>
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