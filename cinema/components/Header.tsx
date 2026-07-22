'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shuffle, Library, Compass, ListChecks } from 'lucide-react';
import { useProfile } from './TelegramProvider';

const NAV_ITEMS = [
  { href: '/', label: 'Библиотека', icon: Library },
  { href: '/discover', label: 'Обзор', icon: Compass },
  { href: '/lists', label: 'Списки', icon: ListChecks },
  { href: '/randomizer', label: 'Рандомайзер', icon: Shuffle },
];

export function Header() {
  const { profile } = useProfile();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 pt-3">
        <span className="font-bold text-lavender">КиноБиблиотека</span>
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
      <nav className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${
                active ? 'bg-lavender text-black' : 'bg-surface text-text-muted hover:bg-surface-hover'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
