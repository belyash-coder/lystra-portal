"use client";

import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "@/lib/store/usePlayerStore";

export default function GlobalPlayer() {
  const { currentTrack, isPlaying, volume, togglePlayPause, setVolume } = usePlayerStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Синхронизация статуса play/pause
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => console.error("Автовоспроизведение заблокировано браузером"));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrack]);

  // Синхронизация громкости
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setProgress(newTime);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Если трек не выбран, плеер полностью скрывается с экрана
  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full h-24 bg-[#121212]/95 backdrop-blur-xl border-t border-neutral-800 z-[9999] px-4 md:px-8 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      
      {/* Скрытый HTML5 аудио элемент */}
      <audio 
        ref={audioRef} 
        src={currentTrack.url} 
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => togglePlayPause()} 
      />

      {/* 1. Информация о треке */}
      <div className="flex items-center gap-4 w-1/3 min-w-[200px]">
        <div className="w-14 h-14 bg-neutral-800 rounded-md overflow-hidden flex-shrink-0 border border-neutral-700">
          {currentTrack.coverUrl ? (
            <img src={currentTrack.coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#a78bfa]/20 to-[#34d399]/20">
              <span className="text-[#a78bfa] text-xs font-bold">LY</span>
            </div>
          )}
        </div>
        <div className="flex flex-col overflow-hidden whitespace-nowrap text-ellipsis">
          <span className="text-white font-medium truncate">
            {currentTrack.title}
          </span>
          <span className="text-neutral-400 text-sm truncate">
            {currentTrack.artist}
          </span>
        </div>
      </div>

      {/* 2. Управление и прогресс-бар */}
      <div className="flex flex-col items-center justify-center w-1/3 max-w-[500px] gap-2">
        <button 
          onClick={togglePlayPause}
          className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 hover:bg-[#34d399] transition-all"
        >
          {isPlaying ? (
            // Иконка паузы
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
          ) : (
            // Иконка плей
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>

        <div className="flex items-center w-full gap-3 text-xs text-neutral-400 font-medium">
          <span>{formatTime(progress)}</span>
          <input 
            type="range" 
            min="0" 
            max={duration || 100} 
            value={progress} 
            onChange={handleSeek}
            className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#a78bfa] hover:accent-[#34d399] transition-all"
          />
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* 3. Управление громкостью */}
      <div className="flex items-center justify-end w-1/3 gap-3 min-w-[150px]">
        {/* Иконка громкости */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01"
          value={volume} 
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-24 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#a78bfa] hover:accent-[#34d399] transition-all"
        />
      </div>

    </div>
  );
}