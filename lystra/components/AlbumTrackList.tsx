"use client";

import { useState } from "react";
import CustomAudioPlayer from "@/components/CustomAudioPlayer";

interface AlbumTrackListProps {
  tracks: any[];
  artistName?: string;
  coverUrl?: string;
}

export default function AlbumTrackList({ tracks, artistName = "Неизвестный исполнитель", coverUrl }: AlbumTrackListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const limit = 3;
  const hasMore = tracks.length > limit;

  // Вспомогательная функция для генерации объекта трека
  const getTrackObject = (track: any) => ({
    id: track.id.toString(),
    title: track.title,
    url: track.preview,
    artist: track.artist?.name || artistName,
    coverUrl: coverUrl
  });

  return (
    <div className="w-full mb-16">
      <div className="grid grid-cols-[auto_1fr_auto] gap-4 text-neutral-400 border-b border-neutral-800 pb-2 mb-4 px-4 text-sm font-bold">
        <span>#</span>
        <span>Название</span>
        <span>Превью</span>
      </div>

      <div className="flex flex-col gap-1">
        {/* Всегда видимые первые треки */}
        {tracks.slice(0, limit).map((track, index) => (
          <div
            key={track.id}
            className="grid grid-cols-[auto_1fr_auto] gap-4 items-center p-3 hover:bg-neutral-900/50 rounded-xl transition-colors group"
          >
            <span className="w-6 text-right text-neutral-500 font-medium">{index + 1}</span>
            <span className="font-bold truncate group-hover:text-[#a78bfa] transition-colors">
              {track.title}
            </span>

            {track.preview ? (
              <CustomAudioPlayer track={getTrackObject(track)} />
            ) : (
              <span className="text-neutral-600 text-xs italic">Нет превью</span>
            )}
          </div>
        ))}

        {/* Скрытые треки */}
        {hasMore && (
          <div 
            className={`grid transition-all duration-300 ease-in-out md:grid-rows-[1fr] md:opacity-100 ${
              isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden flex flex-col gap-1">
              {tracks.slice(limit).map((track, index) => (
                <div
                  key={track.id}
                  className="grid grid-cols-[auto_1fr_auto] gap-4 items-center p-3 hover:bg-neutral-900/50 rounded-xl transition-colors group"
                >
                  <span className="w-6 text-right text-neutral-500 font-medium">{limit + index + 1}</span>
                  <span className="font-bold truncate group-hover:text-[#a78bfa] transition-colors">
                    {track.title}
                  </span>

                  {track.preview ? (
                    <CustomAudioPlayer track={getTrackObject(track)} />
                  ) : (
                    <span className="text-neutral-600 text-xs italic">Нет превью</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {hasMore && (
        <div className="mt-4 flex justify-center md:hidden">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm font-bold text-[#a78bfa] bg-[#a78bfa]/10 px-6 py-3 rounded-full border border-[#a78bfa]/20 hover:bg-[#a78bfa]/20 transition-colors w-full"
          >
            {isExpanded ? "Скрыть треки" : `Показать все (${tracks.length})`}
          </button>
        </div>
      )}
    </div>
  );
}