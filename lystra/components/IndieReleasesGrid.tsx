"use client";

import { useState } from "react";
import Link from "next/link";

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
            
            const artistName = release?.artists?.stage_name || "Неизвестный артист";

            return (
              <Link href={`/release/${release?.id}`} key={track.id} className="group cursor-pointer block">
                <div className="relative aspect-square overflow-hidden rounded-xl mb-4 bg-neutral-900 shadow-lg">
                  {coverUrl && <img src={coverUrl} alt={track.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />}
                </div>
                <h3 className="font-bold text-base text-white truncate group-hover:text-[#a78bfa] transition-colors">{track.title}</h3>
                <p className="text-sm text-neutral-400 truncate mt-1">{artistName}</p>
                {release?.genre && (
                  <div className="mt-2">
                    <span className="inline-block text-xs border border-[#a78bfa]/30 text-neutral-400 px-2 py-0.5 rounded-md max-w-full truncate">
                      {release.genre}
                    </span>
                  </div>
                )}
              </Link>
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