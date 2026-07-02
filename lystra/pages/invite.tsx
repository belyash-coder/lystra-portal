import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function InvitePage() {
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (id) {
      // Пытаемся перебросить в мобильное приложение LYSTRA
      window.location.href = `lystra-app://profile/${id}`;
    }
  }, [id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#000000', color: '#ffffff', fontFamily: 'sans-serif', margin: 0 }}>
      <h1 style={{ color: '#A78BFA', marginBottom: '16px', letterSpacing: '4px', fontSize: '32px', fontWeight: '900' }}>LYSTRA</h1>
      <p style={{ color: '#9CA3AF', marginBottom: '32px', fontSize: '16px' }}>Открываем приложение...</p>
      
      <a
        href={`lystra-app://profile/${id}`}
        style={{ padding: '16px 32px', backgroundColor: '#6EE7B7', color: '#000000', borderRadius: '16px', textDecoration: 'none', fontWeight: 'bold', fontSize: '16px' }}
      >
        Открыть вручную
      </a>
    </div>
  );
}