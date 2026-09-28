import type { Metadata, Viewport } from "next";
import "./globals.css";

// Сайт портала убран (решение 2026-09-28): остался только бэкенд для
// Telegram Mini App (tma.lystramusic.com) и бота — API в app/api и страница
// рассылки app/admin/broadcast. Поэтому и оболочка — минимальная, без шапки,
// плеера и чатов сайта.
export const metadata: Metadata = {
  title: "LYSTRA",
  description: "Музыкальная рулетка жанров в Telegram",
};

export const viewport: Viewport = {
  themeColor: "#121212",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="bg-[#121212] text-white min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
