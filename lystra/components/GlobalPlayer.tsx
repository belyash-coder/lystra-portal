"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePlayerStore } from "@/lib/store/usePlayerStore";

export default function GlobalPlayer() {
  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    isShuffled,
    queue,
    playOrder,
    playOrderIndex,
    togglePlayPause,
    setVolume,
    toggleMute,
    playNext,
    playPrev,
    toggleShuffle,
    playAtOrderIndex,
    removeFromQueue,
  } = usePlayerStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  // Сбрасываем прогресс/ошибку при смене трека без лишнего эффекта
  const lastTrackIdRef = useRef(currentTrack?.id);
  if (lastTrackIdRef.current !== currentTrack?.id) {
    lastTrackIdRef.current = currentTrack?.id;
    setLoadError(false);
    setProgress(0);
    setDuration(0);
  }

  const hasQueue = queue.length > 1;

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

  const handleError = () => {
    setLoadError(true);
    console.error(`Не удалось загрузить трек: ${currentTrack?.title}`);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleEnded = () => {
    if (hasQueue) {
      playNext();
    } else {
      togglePlayPause();
    }
  };

  // Если трек не выбран, плеер полностью скрывается с экрана
  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full min-h-16 md:h-24 bg-[#121212]/95 backdrop-blur-xl border-t border-neutral-800 z-[9999] px-3 md:px-8 py-2 md:py-0 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">

      {/* Скрытый HTML5 аудио элемент */}
      <audio
        ref={audioRef}
        src={currentTrack.url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
      />

      {/* 1. Информация о треке */}
      <div className="flex items-center gap-3 md:gap-4 w-full md:w-1/3 md:min-w-[200px]">
        <div className="w-12 h-12 md:w-14 md:h-14 bg-neutral-800 rounded-md overflow-hidden flex-shrink-0 border border-neutral-700">
          {currentTrack.coverUrl ? (
            <img src={currentTrack.coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#a78bfa]/20 to-[#34d399]/20">
              <span className="text-[#a78bfa] text-xs font-bold">LY</span>
            </div>
          )}
        </div>
        <div className="flex flex-col overflow-hidden whitespace-nowrap text-ellipsis min-w-0">
          <span className="text-white font-medium truncate">
            {currentTrack.title}
          </span>
          {loadError ? (
            <span className="text-neutral-400 text-sm truncate">Ошибка загрузки трека</span>
          ) : currentTrack.artistId ? (
            <Link
              href={`/artist/${currentTrack.artistId}`}
              className="text-neutral-400 text-sm truncate hover:text-white hover:underline w-fit"
            >
              {currentTrack.artist}
            </Link>
          ) : (
            <span className="text-neutral-400 text-sm truncate">{currentTrack.artist}</span>
          )}
        </div>
      </div>

      {/* 2. Управление и прогресс-бар */}
      <div className="flex flex-col items-center justify-center w-full md:w-1/3 md:max-w-[500px] gap-2">
        <div className="flex items-center gap-4 md:gap-5">
          <button
            onClick={playPrev}
            disabled={!hasQueue}
            aria-label="Предыдущий трек"
            className="text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
          </button>

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

          <button
            onClick={playNext}
            disabled={!hasQueue}
            aria-label="Следующий трек"
            className="text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg>
          </button>

          <button
            onClick={toggleShuffle}
            aria-label="Перемешать очередь"
            aria-pressed={isShuffled}
            className={`transition-colors ${isShuffled ? "text-[#34d399]" : "text-neutral-400 hover:text-white"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 3 21 3 21 8"></polyline>
              <line x1="4" y1="20" x2="21" y2="3"></line>
              <polyline points="21 16 21 21 16 21"></polyline>
              <line x1="15" y1="15" x2="21" y2="21"></line>
              <line x1="4" y1="4" x2="9" y2="9"></line>
            </svg>
          </button>

          <button
            onClick={() => setIsQueueOpen((open) => !open)}
            aria-label="Очередь воспроизведения"
            aria-pressed={isQueueOpen}
            className={`transition-colors ${isQueueOpen ? "text-[#34d399]" : "text-neutral-400 hover:text-white"}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="hidden md:flex items-center w-full gap-3 text-xs text-neutral-400 font-medium">
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
      <div className="hidden md:flex items-center justify-end w-1/3 gap-3 min-w-[150px]">
        <button onClick={toggleMute} aria-label={isMuted ? "Включить звук" : "Выключить звук"} className="text-neutral-400 hover:text-white transition-colors">
          {isMuted || volume === 0 ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <line x1="23" y1="9" x2="17" y2="15"></line>
              <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          )}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-24 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#a78bfa] hover:accent-[#34d399] transition-all"
        />
      </div>

      {/* 4. Очередь воспроизведения */}
      {isQueueOpen && (
        <div className="fixed bottom-20 md:bottom-24 right-3 md:right-8 w-[calc(100%-1.5rem)] max-w-sm max-h-[60vh] bg-[#181818] border border-neutral-800 rounded-2xl shadow-2xl z-[9998] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 flex-shrink-0">
            <span className="text-white font-bold text-sm">Очередь воспроизведения</span>
            <button
              onClick={() => setIsQueueOpen(false)}
              aria-label="Закрыть очередь"
              className="text-neutral-400 hover:text-white transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {playOrder.length === 0 ? (
              <p className="text-neutral-500 text-sm px-4 py-6 text-center">Очередь пуста</p>
            ) : (
              playOrder.map((queueIndex, orderIndex) => {
                const track = queue[queueIndex];
                if (!track) return null;
                const isCurrent = orderIndex === playOrderIndex;

                return (
                  <div
                    key={`${track.id}-${orderIndex}`}
                    onClick={() => playAtOrderIndex(orderIndex)}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-neutral-900/70 transition-colors group ${isCurrent ? "bg-neutral-900/50" : ""}`}
                  >
                    <div className="w-9 h-9 bg-neutral-800 rounded overflow-hidden flex-shrink-0 border border-neutral-700">
                      {track.coverUrl ? (
                        <img src={track.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#a78bfa]/20 to-[#34d399]/20">
                          <span className="text-[#a78bfa] text-[10px] font-bold">LY</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                      <span className={`text-sm font-medium truncate ${isCurrent ? "text-[#34d399]" : "text-white"}`}>
                        {track.title}
                      </span>
                      <span className="text-neutral-400 text-xs truncate">{track.artist}</span>
                    </div>
                    {!isCurrent && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromQueue(track.id);
                        }}
                        aria-label={`Удалить "${track.title}" из очереди`}
                        className="text-neutral-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

    </div>
  );
}
