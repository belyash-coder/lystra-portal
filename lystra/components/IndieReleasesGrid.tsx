"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, ExternalLink } from "lucide-react";

export default function IndieReleasesGrid({ initialTracks }: { initialTracks: any[] }) {
  const [visibleCount, setVisibleCount] = useState(10);

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 10);
  };

  const visibleTracks = initialTracks.slice(0, visibleCount);

  return (
    <div className="space-y-12">
      {visibleTracks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-8">
          {visibleTracks.map((track: any) => {
            const release = track.releases;
            const coverUrl = release?.cover_path?.startsWith('http') 
              ? release.cover_path 
              : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/release_covers/${release?.cover_path}`;
            
            const isExternalLink = track.audio_path?.startsWith('http');
            const linkHref = isExternalLink ? track.audio_path : `/release/${release?.id}`;
            const artistName = release?.artists?.stage_name || "Неизвестный артист";

            if (isExternalLink) {
              let platformName = "источнике";
              if (track.audio_path?.includes('soundcloud.com')) {
                platformName = "SoundCloud";
              } else if (track.audio_path?.includes('bandcamp.com') || track.audio_path?.startsWith('bandcamp:')) {
                platformName = "Bandcamp";
              }

              return (
                <div key={track.id} tabIndex={0} className="group block outline-none">
                  <div className="relative aspect-square overflow-hidden rounded-xl mb-4 bg-neutral-900 shadow-lg cursor-pointer">
                    {coverUrl && <img src={coverUrl} alt={track.title} className="object-cover w-full h-full group-hover:scale-105 group-focus:scale-105 transition-transform duration-500" />}
                    <a 
                      href={linkHref} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/50 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus:opacity-100 group-focus:pointer-events-auto transition-opacity duration-300 flex flex-col items-center justify-center gap-2 backdrop-blur-sm"
                    >
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#34d399]/90 flex items-center justify-center text-black shadow-lg flex-shrink-0">
                        <ExternalLink className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <span className="text-white text-[10px] sm:text-xs font-medium text-center leading-tight px-1">
                        Слушать на<br/>
                        <span className="font-bold text-[#34d399]">{platformName}</span>
                      </span>
                    </a>
                  </div>
                  <a href={linkHref} target="_blank" rel="noopener noreferrer" className="block focus:outline-none">
                    <h3 className="font-bold text-base text-white truncate group-hover:text-[#34d399] group-focus:text-[#34d399] transition-colors">{track.title}</h3>
                  </a>
                  <p className="text-sm text-neutral-400 truncate mt-1">{artistName}</p>
                  {release?.genre && (
                    <div className="mt-2">
                      <span className="inline-block text-xs border border-[#a78bfa]/30 text-neutral-400 px-2 py-0.5 rounded-md max-w-full truncate">
                        {release.genre}
                      </span>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={track.id} tabIndex={0} className="group block outline-none">
                <div className="relative aspect-square overflow-hidden rounded-xl mb-4 bg-neutral-900 shadow-lg cursor-pointer">
                  {coverUrl && <img src={coverUrl} alt={track.title} className="object-cover w-full h-full group-hover:scale-105 group-focus:scale-105 transition-transform duration-500" />}
                  <Link 
                    href={`/release/${release?.id}`}
                    className="absolute inset-0 bg-black/40 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus:opacity-100 group-focus:pointer-events-auto transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#a78bfa]/90 flex items-center justify-center text-black">
                      <Play className="w-6 h-6 ml-1" fill="currentColor" />
                    </div>
                  </Link>
                </div>
                <Link href={`/release/${release?.id}`} className="block focus:outline-none">
                  <h3 className="font-bold text-base text-white truncate group-hover:text-[#a78bfa] group-focus:text-[#a78bfa] transition-colors">{track.title}</h3>
                </Link>
                <p className="text-sm text-neutral-400 truncate mt-1">{artistName}</p>
                {release?.genre && (
                  <div className="mt-2">
                    <span className="inline-block text-xs border border-[#a78bfa]/30 text-neutral-400 px-2 py-0.5 rounded-md max-w-full truncate">
                      {release.genre}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-neutral-500 text-sm text-center py-12 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/20">
          В этом жанре пока пусто. Ждем новые релизы!
        </p>
      )}

      {visibleCount < initialTracks.length && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleLoadMore}
            className="px-8 py-3 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-300 font-bold hover:bg-neutral-800 hover:text-white hover:border-[#a78bfa] transition-all"
          >
            Загрузить еще
          </button>
        </div>
      )}
    </div>
  );
}