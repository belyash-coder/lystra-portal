"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import type { Track } from "@/lib/store/usePlayerStore";

function TrackCover({ track, className }: { track: Track; className: string }) {
  return (
    <div className={`bg-neutral-800 rounded-md overflow-hidden flex-shrink-0 border border-neutral-700 ${className}`}>
      {track.coverUrl ? (
        <img src={track.coverUrl} alt="Cover" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#a78bfa]/20 to-[#34d399]/20">
          <span className="text-[#a78bfa] text-xs font-bold">LY</span>
        </div>
      )}
    </div>
  );
}

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
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  // Сбрасываем прогресс/ошибку при смене трека без лишнего эффекта
  const lastTrackIdRef = useRef(currentTrack?.id);
  if (lastTrackIdRef.current !== currentTrack?.id) {
    lastTrackIdRef.current = currentTrack?.id;
    setLoadError(false);
    setProgress(0);
    setDuration(0);
  }

  const hasQueue = queue.length > 1;
  const progressPercent = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

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

  const renderArtistName = (className: string, collapseOnNavigate = false) => {
    if (loadError) {
      return <span className={className}>Ошибка загрузки трека</span>;
    }
    if (currentTrack.artistId) {
      return (
        <Link
          href={`/artist/${currentTrack.artistId}`}
          onClick={(e) => {
            e.stopPropagation();
            // В фуллскрин-режиме плеер перекрывает весь экран, поэтому без
            // сворачивания переход на страницу артиста незаметен пользователю.
            if (collapseOnNavigate) {
              setIsMobileExpanded(false);
              setIsQueueOpen(false);
            }
          }}
          className={`${className} hover:text-white hover:underline w-fit`}
        >
          {currentTrack.artist}
        </Link>
      );
    }
    return <span className={className}>{currentTrack.artist}</span>;
  };

  const queueItems = playOrder.map((queueIndex, orderIndex) => {
    const track = queue[queueIndex];
    if (!track) return null;
    const isCurrent = orderIndex === playOrderIndex;

    return (
      <div
        key={`${track.id}-${orderIndex}`}
        onClick={() => playAtOrderIndex(orderIndex)}
        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-neutral-900/70 transition-colors group ${isCurrent ? "bg-neutral-900/50" : ""}`}
      >
        <TrackCover track={track} className="w-9 h-9" />
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
  });

  return (
    <>
      {/* Скрытый HTML5 аудио элемент — общий для мобильной и десктопной разметки */}
      <audio
        ref={audioRef}
        src={currentTrack.url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
      />

      {/* ===== Мобильный полноэкранный плеер ===== */}
      {isMobileExpanded && (
        <div className="md:hidden fixed inset-0 z-[10000] bg-[#121212] flex flex-col px-6 pt-4 pb-8">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => {
                setIsMobileExpanded(false);
                setIsQueueOpen(false);
              }}
              aria-label="Свернуть плеер"
              className="text-neutral-400 hover:text-white transition-colors p-2 -ml-2"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <span className="text-xs font-bold text-neutral-400 tracking-wide">СЕЙЧАС ИГРАЕТ</span>
            <button
              onClick={() => setIsQueueOpen((open) => !open)}
              aria-label="Очередь воспроизведения"
              aria-pressed={isQueueOpen}
              className={`p-2 -mr-2 transition-colors ${isQueueOpen ? "text-[#34d399]" : "text-neutral-400 hover:text-white"}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
          </div>

          {isQueueOpen ? (
            <div className="flex-1 overflow-y-auto -mx-6">
              {queueItems.length === 0 ? (
                <p className="text-neutral-500 text-sm px-6 py-6 text-center">Очередь пуста</p>
              ) : (
                queueItems
              )}
            </div>
          ) : (
            <>
              <div className="flex-1 flex items-center justify-center min-h-0">
                <TrackCover track={currentTrack} className="w-full max-w-[320px] aspect-square" />
              </div>

              <div className="flex flex-col overflow-hidden mb-6">
                <span className="text-white font-bold text-xl truncate">{currentTrack.title}</span>
                {renderArtistName("text-neutral-400 text-base truncate", true)}
              </div>

              <div className="flex flex-col gap-2 mb-6">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={progress}
                  onChange={handleSeek}
                  className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#a78bfa]"
                />
                <div className="flex items-center justify-between text-xs text-neutral-400 font-medium">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={toggleShuffle}
                  aria-label="Перемешать очередь"
                  aria-pressed={isShuffled}
                  className={`p-2 transition-colors ${isShuffled ? "text-[#34d399]" : "text-neutral-400 hover:text-white"}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 3 21 3 21 8"></polyline>
                    <line x1="4" y1="20" x2="21" y2="3"></line>
                    <polyline points="21 16 21 21 16 21"></polyline>
                    <line x1="15" y1="15" x2="21" y2="21"></line>
                    <line x1="4" y1="4" x2="9" y2="9"></line>
                  </svg>
                </button>

                <div className="flex items-center gap-6">
                  <button
                    onClick={playPrev}
                    disabled={!hasQueue}
                    aria-label="Предыдущий трек"
                    className="text-white disabled:opacity-30 transition-colors"
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                  </button>

                  <button
                    onClick={togglePlayPause}
                    className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all"
                  >
                    {isPlaying ? (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
                    ) : (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M8 5v14l11-7z"/></svg>
                    )}
                  </button>

                  <button
                    onClick={playNext}
                    disabled={!hasQueue}
                    aria-label="Следующий трек"
                    className="text-white disabled:opacity-30 transition-colors"
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg>
                  </button>
                </div>

                <button
                  onClick={toggleMute}
                  aria-label={isMuted ? "Включить звук" : "Выключить звук"}
                  className="p-2 text-neutral-400 hover:text-white transition-colors"
                >
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
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== Плеер снизу экрана: компактный мини-бар на мобильных, полная раскладка на десктопе ===== */}
      <div className="fixed bottom-0 left-0 w-full h-16 md:h-24 bg-[#121212]/95 backdrop-blur-xl border-t border-neutral-800 z-[9999] shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">

        {/* Мобильный мини-бар */}
        <div
          onClick={() => setIsMobileExpanded(true)}
          className="flex md:hidden items-center gap-3 w-full h-full px-3 relative cursor-pointer"
        >
          <div className="absolute top-0 left-0 h-0.5 w-full bg-neutral-800">
            <div className="h-full bg-[#34d399]" style={{ width: `${progressPercent}%` }} />
          </div>

          <TrackCover track={currentTrack} className="w-11 h-11" />

          <div className="flex flex-col overflow-hidden min-w-0 flex-1">
            <span className="text-white font-medium text-sm truncate">{currentTrack.title}</span>
            {renderArtistName("text-neutral-400 text-xs truncate block")}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
            aria-label={isPlaying ? "Пауза" : "Играть"}
            className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center flex-shrink-0"
          >
            {isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              playNext();
            }}
            disabled={!hasQueue}
            aria-label="Следующий трек"
            className="text-neutral-400 disabled:opacity-30 flex-shrink-0 p-1"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg>
          </button>
        </div>

        {/* Десктопная раскладка */}
        <div className="hidden md:flex items-center justify-between h-full px-8">
          {/* 1. Информация о треке */}
          <div className="flex items-center gap-4 w-1/3 min-w-[200px]">
            <TrackCover track={currentTrack} className="w-14 h-14" />
            <div className="flex flex-col overflow-hidden min-w-0">
              <span className="text-white font-medium truncate">{currentTrack.title}</span>
              {renderArtistName("text-neutral-400 text-sm truncate block")}
            </div>
          </div>

          {/* 2. Управление и прогресс-бар */}
          <div className="flex flex-col items-center justify-center w-1/3 max-w-[500px] gap-2">
            <div className="flex items-center gap-5">
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
                ) : (
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
        </div>

        {/* Очередь воспроизведения — десктопная плавающая панель */}
        {isQueueOpen && (
          <div className="hidden md:flex fixed bottom-24 right-8 w-full max-w-sm max-h-[60vh] bg-[#181818] border border-neutral-800 rounded-2xl shadow-2xl z-[9998] flex-col overflow-hidden">
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
              {queueItems.length === 0 ? (
                <p className="text-neutral-500 text-sm px-4 py-6 text-center">Очередь пуста</p>
              ) : (
                queueItems
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
