import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { TelegramProvider } from '@/components/TelegramProvider';
import { AuthGate } from '@/components/AuthGate';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'КиноБиблиотека',
  description: 'Личный каталог фильмов с рандомайзером',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen antialiased">
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <TelegramProvider>
          <AuthGate>
            <Header />
            <main className="mx-auto max-w-5xl px-4 pb-16 pt-4">{children}</main>
          </AuthGate>
        </TelegramProvider>
      </body>
    </html>
  );
}
