'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function InviteContent() {
  const searchParams = useSearchParams();
  const id = searchParams?.get('id') || '';
  const type = searchParams?.get('type') || 'profile';

  useEffect(() => {
    // Умный JS-редирект с учетом типа ссылки (профиль или коллекция)
    if (id) {
      window.location.href = `lystra-app://${type}/${id}`;
    }
  }, [id, type]);

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
        <p>Если приложение не открылось автоматически, нажмите <a href={`lystra-app://${type}/${id}`} style={{ color: '#98FF98', textDecoration: 'none' }}>сюда</a>.</p>
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