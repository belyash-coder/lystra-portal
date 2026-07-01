import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";
import AuthButton from "@/components/AuthButton";
import MobileMenu from "@/components/MobileMenu";
import { NotificationBell } from "@/components/NotificationBell";
import { ChatProvider } from "@/components/ChatProvider"; // <-- 1. ДОБАВИЛИ ИМПОРТ
import { Dices } from "lucide-react";

export const metadata: Metadata = {
  title: "LYSTRA",
  description: "Музыкальный портал для независимых артистов и слушателей",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <Script 
          src="https://telegram.org/js/telegram-web-app.js" 
          strategy="beforeInteractive" 
        />
      </head>
      <body className="bg-[#121212] text-white min-h-screen flex flex-col font-sans overflow-x-hidden">
        
        {/* 2. ОБЕРНУЛИ ВЕСЬ КОНТЕНТ В ПРОВАЙДЕР */}
        <ChatProvider>
          
          {/* ГЛОБАЛЬНАЯ ШАПКА НАВИГАЦИИ */}
          <header className="w-full bg-[#121212]/90 backdrop-blur-md border-b border-neutral-800 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
              
              <div className="flex-shrink-0 z-50">
                <Link href="/" className="text-2xl font-black tracking-wider text-white hover:opacity-90 relative z-50 w-max">
                  LYSTRA<span className="text-[#34d399]">.</span>
                </Link>
              </div>

              <div className="flex items-center gap-4 md:gap-6">
                <nav className="hidden md:flex items-center gap-6">
                  <Link href="/" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors">Лента</Link>
                  <Link href="/search" className="text-sm font-medium text-neutral-300 hover:text-[#a78bfa] transition-colors">Поиск</Link>
                  <Link href="/releases" className="text-sm font-medium text-neutral-300 hover:text-[#34d399] transition-colors">Инди-радар</Link>
                  
                 <Link href="/discover" className="text-sm font-bold flex items-center gap-1.5 text-[#121212] bg-gradient-to-r from-[#a78bfa] to-[#34d399] px-3 py-1.5 rounded-lg hover:scale-105 transition-transform shadow-[0_0_10px_rgba(52,211,153,0.3)]">
                    <Dices className="w-4 h-4" /> Random Genre
                  </Link>

                  <Link href="/studio" className="text-sm font-bold bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20 px-4 py-1.5 rounded-lg hover:bg-[#a78bfa]/20 transition-colors">
                    Студия
                  </Link>
                </nav>

                <NotificationBell />

                <div className="hidden md:block">
                  <AuthButton />
                </div>

                <div className="flex-shrink-0 z-[10000] md:hidden">
                  <MobileMenu authNode={<AuthButton />} />
                </div>
              </div>
            </div>
          </header>

          {/* ОСНОВНОЙ КОНТЕНТ СТРАНИЦ */}
          <div className="flex-grow">
            {children}
          </div>

        </ChatProvider>
      </body>
    </html>
  );
}