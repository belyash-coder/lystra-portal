import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";
import AuthButton from "@/components/AuthButton";
import MobileMenu from "@/components/MobileMenu";
import { NotificationBell } from "@/components/NotificationBell";
import { ChatProvider } from "@/components/ChatProvider"; // <-- 1. ДОБАВИЛИ ИМПОРТ

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
    <html lang="ru" className="scroll-smooth" suppressHydrationWarning>
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
            <div className="max-w-[1600px] mx-auto px-6 md:px-12 h-16 flex items-center justify-between gap-4">
              
              <div className="flex-shrink-0 z-50">
                <Link href="/" className="flex flex-col hover:opacity-90 relative z-50 w-max">
                  <div className="text-2xl font-black tracking-wider leading-none">
                    <span className="text-[#a78bfa]">LY</span>
                    <span className="text-[#34d399]">ST</span>
                    <span className="text-[#a78bfa]">RA</span>
                  </div>
                  <span className="text-[10px] font-medium tracking-wider text-neutral-400 mt-1">
                    Music Discovery
                  </span>
                </Link>
              </div>

              <div className="flex items-center gap-4 md:gap-6">
                <nav className="hidden md:flex items-center gap-6">
                  <Link href="/" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors">Главная</Link>
                  <Link href="/search" className="text-sm font-medium text-neutral-300 hover:text-[#a78bfa] transition-colors">Поиск</Link>
                  <Link href="/reviews" className="text-sm font-medium text-neutral-300 hover:text-[#a78bfa] transition-colors">Отзывы и рецензии</Link>
                  <Link href="/about" className="text-sm font-medium text-neutral-300 hover:text-[#34d399] transition-colors">О нас</Link>
                </nav>

                <div className="hidden md:block">
                  <AuthButton />
                </div>

                <div className="flex-shrink-0 z-[10000] md:hidden">
                  <MobileMenu authNode={<AuthButton isMobile />} />
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