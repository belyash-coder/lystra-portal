'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import { getSession } from 'next-auth/react';
import { Home, Search, MessageSquare, Info } from 'lucide-react';
import { getFrameClass, getGlowClass, hasGlow } from '@/lib/levelTiers';

const NAV_ITEMS = [
  { href: '/', label: 'Главная', icon: Home },
  { href: '/search', label: 'Поиск', icon: Search },
  { href: '/reviews', label: 'Отзывы и рецензии', icon: MessageSquare },
  { href: '/about', label: 'О нас', icon: Info },
];

export default function MobileMenu({ authNode }: { authNode: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [xp, setXp] = useState(0);

  // Заглушка для счетчика уведомлений (таблицу notifications добавим позже)
  const unreadCount = 0;
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    getSession().then((session) => {
      if (session?.user) {
        setAvatarUrl(session.user.image || null);
        setUsername(session.user.name || null);
        fetch('/api/profile/me')
          .then((res) => res.json())
          .then((data) => setXp(data.xp || 0))
          .catch(() => setXp(0));
      } else {
        setAvatarUrl(null);
        setUsername(null);
        setXp(0);
      }
    });
  }, [pathname]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const menuContent = (
    <div
      className={`fixed inset-0 top-16 z-[9999] bg-[#0a0a0a] flex flex-col p-6 border-t border-neutral-900 transition-transform duration-200 ease-out overflow-y-auto custom-scrollbar pb-24 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-neutral-300 hover:bg-white/5 hover:text-white active:bg-white/10 transition-all"
          >
            <Icon className="w-5 h-5 text-neutral-500" />
            {label}
          </Link>
        ))}
      </nav>

      <hr className="border-neutral-900 my-4" />

      <div className="flex flex-col w-full">
         {authNode}
      </div>
    </div>
  );

  return (
    <div className="md:hidden flex items-center">
      <button
        onPointerDown={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        type="button"
        className="text-neutral-300 hover:text-white focus:outline-none z-[10000] relative p-3 -mr-3 flex items-center justify-center min-w-[56px] min-h-[56px] select-none touch-none"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        aria-label="Открыть меню"
      >
        {!isOpen && unreadCount > 0 && (
          <span className="absolute top-2 right-2 min-w-[18px] h-[18px] bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-black font-mono px-1 shadow-md pointer-events-none z-10 animate-in zoom-in duration-200">
            {unreadCount}
          </span>
        )}
        {isOpen ? (
          <svg className="w-7 h-7 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : username ? (
          <div className={`w-8 h-8 relative rounded-full flex-shrink-0 pointer-events-none transition-all ${getFrameClass(xp, 'compact')}`}>
            {hasGlow(xp) && <div className={getGlowClass('compact')}></div>}
            <div className="w-full h-full relative rounded-full overflow-hidden bg-neutral-800">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={username} width={32} height={32} className="w-full h-full object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[#34d399] font-bold">
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        ) : (
          <svg className="w-7 h-7 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {mounted && createPortal(menuContent, document.body)}
    </div>
  );
}