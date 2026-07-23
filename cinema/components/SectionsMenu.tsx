'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Compass, Film, Tv, Palette, Shuffle } from 'lucide-react';
import { ProfileMenu } from './ProfileMenu';

const NAV_ITEMS = [
  { href: '/', label: 'Обзор', icon: Compass },
  { href: '/movies', label: 'Фильмы', icon: Film },
  { href: '/tv', label: 'Сериалы', icon: Tv },
  { href: '/animation', label: 'Мультфильмы', icon: Palette },
  { href: '/randomizer', label: 'Рандомайзер', icon: Shuffle },
];

export function SectionsMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Закрываем меню при переходе на новую страницу.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- close drawer on navigation
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-hover"
        aria-label="Разделы"
      >
        <Menu size={20} />
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-30">
            <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-0 flex h-full w-64 flex-col bg-surface p-4 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-bold text-lavender">Разделы</span>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-hover"
                  aria-label="Закрыть"
                >
                  <X size={18} />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium ${
                        active ? 'bg-lavender text-black' : 'text-text-muted hover:bg-surface-hover'
                      }`}
                    >
                      <Icon size={18} />
                      {label}
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-auto border-t border-white/10 pt-2">
                <ProfileMenu />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
