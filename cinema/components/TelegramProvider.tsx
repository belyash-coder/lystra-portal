'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface Profile {
  id: string;
  username: string | null;
  firstName: string | null;
  avatarUrl: string | null;
}

interface TelegramContextValue {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

const TelegramContext = createContext<TelegramContextValue>({
  profile: null,
  loading: true,
  error: null,
});

export function useProfile() {
  return useContext(TelegramContext);
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        initData: string;
        colorScheme?: string;
        BackButton?: {
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
      };
    };
  }
}

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg || !tg.initData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no Telegram context available, nothing to subscribe to
      setError('Откройте приложение через Telegram-бота, чтобы войти.');
      setLoading(false);
      return;
    }

    tg.ready();
    tg.expand();

    fetch('/api/auth/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: tg.initData }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Не удалось войти');
        }
        return res.json();
      })
      .then((data) => setProfile(data.profile))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <TelegramContext.Provider value={{ profile, loading, error }}>
      {children}
    </TelegramContext.Provider>
  );
}
