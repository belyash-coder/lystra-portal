'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Library, ListChecks } from 'lucide-react';
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
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 text-sm text-text-muted">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-xs">
            {profile.firstName?.[0] ?? '?'}
          </div>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl bg-surface shadow-xl">
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
        </div>
      )}
    </div>
  );
}
