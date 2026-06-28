'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Dices } from 'lucide-react';

export default function MobileMenu({ authNode }: { authNode: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

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
      className={`fixed inset-0 top-16 z-[9999] bg-[#0a0a0a] flex flex-col p-6 border-t border-neutral-900 transition-transform duration-200 ease-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <nav className="flex flex-col gap-6 text-lg font-medium mt-4">
        <Link href="/" className="text-neutral-300 hover:text-white transition-colors">Лента</Link>
        <Link href="/search" className="text-neutral-300 hover:text-[#a78bfa] transition-colors">Поиск</Link>
        <Link href="/releases" className="text-neutral-300 hover:text-[#34d399] transition-colors">Инди-радар</Link>
        
        <Link href="/discover" className="flex items-center justify-center gap-2 text-[#121212] font-bold bg-gradient-to-r from-[#a78bfa] to-[#34d399] px-4 py-3 rounded-xl hover:scale-[1.02] transition-transform shadow-[0_0_15px_rgba(52,211,153,0.2)]">
          <Dices className="w-5 h-5" /> Random Genre
        </Link>

        <Link href="/studio" className="bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20 px-4 py-3 rounded-xl text-center hover:bg-[#a78bfa]/20 transition-colors w-full">
          Студия
        </Link>
      </nav>

      <hr className="border-neutral-900 my-8" />

      <div className="flex justify-center">
         {authNode}
      </div>
    </div>
  );

  return (
    <div className="md:hidden flex items-center">
      <button
        onPointerDown={(e) => {
          // PointerDown срабатывает МГНОВЕННО при касании, игнорируя любые баги свайпов
          e.stopPropagation();
          setIsOpen((prev) => !prev); // Используем prev, чтобы избежать багов двойного клика
        }}
        type="button"
        // touch-none ЖЕСТКО запрещает браузеру думать, что ты хочешь скроллить, когда трогаешь кнопку
        className="text-neutral-300 hover:text-white focus:outline-none z-[10000] relative p-3 -mr-3 flex items-center justify-center min-w-[56px] min-h-[56px] select-none touch-none"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        aria-label="Открыть меню"
      >
        {isOpen ? (
          <svg className="w-7 h-7 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
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