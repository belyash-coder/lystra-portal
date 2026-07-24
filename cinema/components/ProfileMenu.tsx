'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Library, ListChecks, Users2 } from 'lucide-react';
import { useProfile } from './TelegramProvider';

export function ProfileMenu() {
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (!profile) return null;

  return (
    <div className="relative" ref={ref}>
      {open && (
        <div className="absolute bottom-12 left-0 z-20 w-44 overflow-hidden rounded-xl bg-background shadow-xl">
          <Link
            href="/library"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface-hover"
          >
            <Library size={16} />
            Библиотека
          </Link>
          <Link
            href="/lists"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface-hover"
          >
            <ListChecks size={16} />
            Списки
          </Link>
          <Link
            href="/shared-lists"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface-hover"
          >
            <Users2 size={16} />
            Совместные списки
          </Link>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-text-muted hover:bg-surface-hover"
      >
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background text-xs">
            {profile.firstName?.[0] ?? '?'}
          </div>
        )}
        <span className="truncate">{profile.firstName ?? 'Профиль'}</span>
      </button>
    </div>
  );
}
