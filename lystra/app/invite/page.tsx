'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function RedirectComponent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  useEffect(() => {
    if (id) {
      // Автоматически пытаемся открыть приложение LYSTRA
      window.location.href = `lystra-app://profile/${id}`;
      
      // На случай, если приложение не установлено, через 3 секунды можно 
      // перенаправить пользователя в стор (пока оставляем на сайте)
      /* setTimeout(() => {
        window.location.href = 'https://твоя-ссылка-в-app-store';
      }, 3000); */
    }
  }, [id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#000000', color: '#ffffff', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#A78BFA', marginBottom: '16px', letterSpacing: '4px', fontSize: '32px', fontWeight: '900' }}>LYSTRA</h1>
      <p style={{ color: '#9CA3AF', marginBottom: '32px', fontSize: '16px' }}>Открываем приложение...</p>
      
      {/* Кнопка-страховка, если автоматический редирект заблокирован браузером */}
      <a
        href={`lystra-app://profile/${id}`}
        style={{ padding: '16px 32px', backgroundColor: '#6EE7B7', color: '#000000', borderRadius: '16px', textDecoration: 'none', fontWeight: 'bold', fontSize: '16px' }}
      >
        Открыть вручную
      </a>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#000000', height: '100vh' }} />}>
      <RedirectComponent />
    </Suspense>
  );
}