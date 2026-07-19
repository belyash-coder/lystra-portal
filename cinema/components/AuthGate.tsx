'use client';

import { useProfile } from './TelegramProvider';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, error, profile } = useProfile();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-muted">
        Загрузка...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="text-text-muted">{error ?? 'Не удалось войти.'}</p>
      </div>
    );
  }

  return <>{children}</>;
}
