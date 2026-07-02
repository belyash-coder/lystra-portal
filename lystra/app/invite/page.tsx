'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function InviteContent() {
  const searchParams = useSearchParams();
  const id = searchParams?.get('id') || '';

  useEffect(() => {
    // Тот самый JS-редирект (deep link) в мобильное приложение LYSTRA
    if (id) {
      window.location.href = `lystra-app://profile/${id}`;
    }
  }, [id]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#121212',
      color: '#E6E6FA',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      zIndex: 9999
    }}>
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <h2>Загрузка профиля...</h2>
        <p>Если приложение не открылось автоматически, нажмите <a href={`lystra-app://profile/${id}`} style={{ color: '#98FF98', textDecoration: 'none' }}>сюда</a>.</p>
      </div>
    </div>
  );
}

export default function InvitePage() {
  // Suspense обязателен в Next.js при использовании useSearchParams, чтобы сборка не падала
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#121212', width: '100vw', height: '100vh' }} />}>
      <InviteContent />
    </Suspense>
  );
}