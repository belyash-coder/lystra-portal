'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Film, Tv, Sparkles, Shuffle } from 'lucide-react';
import { ProfileMenu } from './ProfileMenu';
import { GlobalSearch } from './GlobalSearch';

const NAV_ITEMS = [
  { href: '/', label: 'Обзор', icon: Compass },
  { href: '/movies', label: 'Фильмы', icon: Film },
  { href: '/tv', label: 'Сериалы', icon: Tv },
  { href: '/animation', label: 'Мультфильмы', icon: Sparkles },
  { href: '/randomizer', label: 'Рандомайзер', icon: Shuffle },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 pt-3">
        <Link href="/" className="font-bold text-lavender">
          КиноБиблиотека
        </Link>
        <ProfileMenu />
      </div>
      <div className="mx-auto max-w-5xl px-4 pt-3">
        <GlobalSearch />
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
