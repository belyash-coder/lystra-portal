"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

interface CustomAudioPlayerProps {
  src: string;
  initialDuration?: number; 
  trackId?: string; 
}

export default function CustomAudioPlayer({ src, initialDuration = 0, trackId }: CustomAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const [duration, setDuration] = useState(initialDuration || 0);

  const listenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    hasTrackedRef.current = false;
    if (listenTimerRef.current) clearTimeout(listenTimerRef.current);
  }, [src]);

  // ДЕТЕКТИВНЫЙ РЕЖИМ ТАЙМЕРА
  useEffect(() => {
    // Пишем в консоль при каждом нажатии плей/пауза
    console.log("Плеер: isPlaying =", isPlaying, " | trackId =", trackId);

    if (isPlaying && trackId && !hasTrackedRef.current) {
      console.log("Плеер: Таймер на 10 секунд запущен...");

      listenTimerRef.current = setTimeout(async () => {
        console.log("Плеер: 10 секунд прошло! Стучимся в Supabase...");
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();

          // Добавили .select(), чтобы база вернула ответ, и мы его проверили
          const { data, error } = await supabase.from('track_plays').insert({
            track_id: trackId,
            listener_id: user?.id || null
          }).select();

          if (error) {
            console.error("Плеер: ОШИБКА БАЗЫ!", error.message);
            alert("❌ Ошибка записи в базу: " + error.message);
          } else {
            console.log("Плеер: УСПЕХ!", data);
            alert("✅ Засчитано 1 прослушивание! Нажми ОК, затем обнови страницу (F5), чтобы увидеть в Аналитике.");
            hasTrackedRef.current = true; 
          }
        } catch (error) {
          console.error("Плеер: ОШИБКА КОДА:", error);
        }
      }, 10000); 
    } else {
      if (listenTimerRef.current) {
        clearTimeout(listenTimerRef.current);
        console.log("Плеер: Таймер сброшен");
      }
    }

    return () => {
      if (listenTimerRef.current) clearTimeout(listenTimerRef.current);
    };
  }, [isPlaying, trackId]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      document.querySelectorAll("audio").forEach((audio) => {
        if (audio !== audioRef.current) {
          audio.pause();
        }
      });
      audioRef.current.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const currentDuration = audio.duration || duration;
    if (currentDuration === 0) return; 
    
    const newProgress = Number(e.target.value);
    const newTime = (newProgress / 100) * currentDuration;
    
    audio.currentTime = newTime;
    setProgress(newProgress);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (initialDuration) {
      setDuration(initialDuration);
    }

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };
    
    const handleTimeUpdate = () => {
      const currentDuration = audio.duration || duration;
      if (currentDuration > 0) {
        setProgress((audio.currentTime / currentDuration) * 100);
      }
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && audio.duration !== initialDuration) {
        setDuration(audio.duration);
      }
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [initialDuration, src]);

  return (
    <div className="flex items-center gap-4 w-full group"> 
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        onClick={togglePlay}
        type="button" 
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-[#34d399]/10 text-[#34d399] hover:bg-[#34d399]/20 hover:scale-105 transition-all duration-200 outline-none"
      >
        {isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className={`flex-1 relative flex items-center h-6 group/slider touch-pan-y transition-opacity duration-300 ${isPlaying ? 'cursor-pointer opacity-100' : 'pointer-events-none opacity-50'}`}>
        <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden pointer-events-none">
          <div
            className="h-full bg-[#a78bfa] transition-all duration-75 ease-linear rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div 
          className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow pointer-events-none opacity-0 transition-opacity z-10 ${isPlaying ? 'group-hover/slider:opacity-100' : ''}`}
          style={{ left: `calc(${progress}% - 6px)` }}
        />

        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress || 0}
          onChange={handleSeek}
          disabled={!isPlaying}
          className={`absolute inset-0 w-full h-full opacity-0 z-20 touch-pan-y ${isPlaying ? 'cursor-pointer' : 'cursor-default'}`}
        />
      </div>
    </div>
  );
}