'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GlobalSearch } from './GlobalSearch';
import { SectionsMenu } from './SectionsMenu';

const SEARCH_VISIBLE_PATHS = ['/', '/movies', '/tv', '/animation', '/search'];

export function Header() {
  const pathname = usePathname();
  const showSearch = SEARCH_VISIBLE_PATHS.includes(pathname);

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
        <SectionsMenu />
        <Link href="/" className="font-bold text-lavender">
          КиноБиблиотека
        </Link>
      </div>
      {showSearch && (
        <div className="mx-auto max-w-5xl px-4 pb-3">
          <GlobalSearch />
        </div>
      )}
    </header>
  );
}
