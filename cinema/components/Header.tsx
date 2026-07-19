'use client';

import Link from 'next/link';
import { Shuffle, Library } from 'lucide-react';
import { useProfile } from './TelegramProvider';

export function Header() {
  const { profile } = useProfile();

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lavender">
            <Library size={20} />
            КиноБиблиотека
          </Link>
          <Link
            href="/randomizer"
            className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-mint hover:bg-surface-hover"
          >
            <Shuffle size={16} />
            Рандомайзер
          </Link>
        </div>
        {profile && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-xs">
                {profile.firstName?.[0] ?? '?'}
              </div>
            )}
            <span className="hidden sm:inline">{profile.firstName ?? profile.username}</span>
          </div>
        )}
      </div>
    </header>
  );
}
