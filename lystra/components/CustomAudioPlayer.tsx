"use client";

import { usePlayerStore } from "@/lib/store/usePlayerStore";

interface CustomAudioPlayerProps {
  track: {
    id: string;
    title: string;
    url: string;
    artist: string;
    artistId?: string;
    coverUrl?: string;
  };
  queue?: CustomAudioPlayerProps["track"][];
}

export default function CustomAudioPlayer({ track, queue }: CustomAudioPlayerProps) {
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = usePlayerStore();

  // Проверяем, играет ли именно этот трек прямо сейчас
  const isThisTrackCurrent = currentTrack?.id === track.id;
  const isThisTrackPlaying = isThisTrackCurrent && isPlaying;

  const handleTogglePlay = () => {
    if (!track.url) return;

    if (isThisTrackCurrent) {
      // Если трек уже загружен в плеер, переключаем play/pause
      togglePlayPause();
    } else {
      // Если это новый трек — загружаем его в глобальный стор вместе с очередью
      playTrack(track, queue);
    }
  };

  if (!track.url) return null;

  return (
    <button
      onClick={handleTogglePlay}
      type="button" 
      className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-[#34d399]/10 text-[#34d399] hover:bg-[#34d399]/20 hover:scale-105 transition-all duration-200 outline-none"
    >
      {isThisTrackPlaying ? (
        // Иконка паузы
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
      ) : (
        // Иконка плей
        <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  );
}