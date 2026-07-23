'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function TelegramBackButton() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const backButton = window.Telegram?.WebApp?.BackButton;
    if (!backButton) return;

    if (pathname === '/') {
      backButton.hide();
      return;
    }

    function onClick() {
      router.back();
    }

    backButton.show();
    backButton.onClick(onClick);
    return () => {
      backButton.offClick(onClick);
    };
  }, [pathname, router]);

  return null;
}
