'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Play, ExternalLink, Music } from 'lucide-react'

export function FollowingTrackCard({ track }: { track: any }) {
  const profile = track.profiles;
  const release = track.releases;
  
  // Логика обложки из твоего IndieReleasesGrid
  const coverUrl = release?.cover_path?.startsWith('http') 
    ? release.cover_path 
    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/release_covers/${release?.cover_path}`;
  
  const isExternalLink = track.audio_path?.startsWith('http');
  const linkHref = isExternalLink ? track.audio_path : `/release/${release?.id}`;
  const artistName = release?.artists?.stage_name || "Неизвестный артист";

  let platformName = "источнике";
  if (track.audio_path?.includes('soundcloud.com')) platformName = "SoundCloud";
  else if (track.audio_path?.includes('bandcamp.com') || track.audio_path?.startsWith('bandcamp:')) platformName = "Bandcamp";

  return (
    <div className="bg-gradient-to-br from-white/5 to-transparent p-5 rounded-2xl border border-white/10 hover:border-[#34d399]/40 hover:shadow-[0_8px_24px_rgba(52,211,153,0.1)] transition-all duration-300 flex flex-col gap-4 relative group backdrop-blur-sm">
      
      {/* Шапка: Автор действия */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <Link href={`/profile/${profile?.username || track.user_id}`} className="flex items-center gap-2.5 group/author">
            <div className="w-8 h-8 relative rounded-full overflow-hidden bg-neutral-800 border border-white/10 shrink-0">
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt="avatar" fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[#34d399]">
                  {profile?.username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <span className="text-xs font-bold text-neutral-200 group-hover/author:text-[#34d399] transition-colors">
              @{profile?.username || 'user'}
            </span>
          </Link>
          <span className="text-xs text-neutral-500 flex items-center gap-1.5">
            <Music className="w-3 h-3 text-[#34d399]" /> добавил(а) релиз
          </span>
        </div>

        {profile?.role === 'admin' && (
          <span className="px-2 py-0.5 bg-rose-500/20 text-rose-500 border border-rose-500/30 text-[9px] rounded-md font-bold uppercase tracking-wider shadow-[0_0_8px_rgba(244,63,94,0.1)]">Admin</span>
        )}
        {profile?.role === 'moderator' && (
          <span className="px-2 py-0.5 bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[9px] rounded-md font-bold uppercase tracking-wider shadow-[0_0_8px_rgba(56,189,248,0.1)]">Mod</span>
        )}
      </div>

      {/* Тело: Обложка + информация */}
      <div className="flex items-center gap-4">
        <a href={linkHref} target={isExternalLink ? "_blank" : "_self"} rel={isExternalLink ? "noopener noreferrer" : ""} className="w-16 h-16 bg-neutral-900 rounded-xl shrink-0 overflow-hidden relative border border-white/10 shadow-md group-hover:border-[#34d399]/50 transition-all duration-300 flex items-center justify-center cursor-pointer">
           {coverUrl ? (
             <img src={coverUrl} alt={track.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
           ) : (
             <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-500">Н/Д</div>
           )}
           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
             {isExternalLink ? <ExternalLink className="w-5 h-5 text-[#34d399]" /> : <Play className="w-5 h-5 text-[#a78bfa] ml-0.5" fill="currentColor" />}
           </div>
        </a>
        
        <div className="flex-1 min-w-0">
          <a href={linkHref} target={isExternalLink ? "_blank" : "_self"} rel={isExternalLink ? "noopener noreferrer" : ""} className="block outline-none">
            <h3 className="font-bold text-sm text-white truncate hover:text-[#34d399] transition-colors">{track.title}</h3>
          </a>
          <p className="text-xs text-neutral-400 truncate mt-0.5">{artistName}</p>
          {isExternalLink && (
             <p className="text-[10px] text-[#34d399] mt-1 font-medium">на {platformName}</p>
          )}
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-auto pt-1">
        <span className="text-[10px] text-gray-500">
          {new Date(track.created_at).toLocaleDateString('ru-RU')}
        </span>
      </div>
    </div>
  )
}