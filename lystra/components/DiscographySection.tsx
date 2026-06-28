"use client";

import { useState } from "react";
import Link from "next/link";

interface Release {
  id: number;
  title: string;
  cover_medium: string;
  release_date: string;
}

interface DiscographySectionProps {
  title: string;
  releases: Release[];
}

export default function DiscographySection({ title, releases }: DiscographySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Если в категории нет релизов, вообще не рендерим секцию
  if (releases.length === 0) return null;

  // Если не развернуто, берем только первые 8 элементов
  const displayedReleases = isExpanded ? releases : releases.slice(0, 8);

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{title}</h2>
        
        {/* Кнопка появляется только если релизов больше 8 */}
        {releases.length > 8 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm font-medium text-[#a78bfa] hover:text-white transition-colors"
          >
            {isExpanded ? "Свернуть" : "Показать все"}
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {displayedReleases.map((album) => (
          <Link 
            href={`/album/${album.id}`} 
            key={album.id}
            className="group block bg-neutral-900/30 border border-neutral-800/50 p-3 rounded-xl hover:border-neutral-700/80 transition-all"
          >
            <div className="aspect-square relative overflow-hidden rounded-lg mb-3">
              <img 
                src={album.cover_medium} 
                alt={album.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <h4 className="font-semibold text-xs truncate" title={album.title}>
              {album.title}
            </h4>
            <p className="text-[10px] text-neutral-500 mt-1">
              {album.release_date ? album.release_date.substring(0, 4) : ""}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}