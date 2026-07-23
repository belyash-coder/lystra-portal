'use client';

import Link from 'next/link';
import { ProfileMenu } from './ProfileMenu';
import { GlobalSearch } from './GlobalSearch';
import { SectionsMenu } from './SectionsMenu';

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <SectionsMenu />
          <Link href="/" className="font-bold text-lavender">
            КиноБиблиотека
          </Link>
        </div>
        <ProfileMenu />
      </div>
      <div className="mx-auto max-w-5xl px-4 pb-3">
        <GlobalSearch />
      </div>
    </header>
  );
}
