import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import Image from 'next/image';

export default async function AuthButton() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Если пользователь НЕ авторизован — показываем кнопку "Войти"
  if (!user) {
    return (
      <Link 
        href="/login" 
        className="text-sm font-bold bg-white text-[#121212] px-4 py-1.5 rounded-lg hover:bg-neutral-200 transition-colors"
      >
        Войти
      </Link>
    );
  }

  // Если авторизован — тянем его профиль
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex items-center gap-4">
      {/* Вот та самая кликабельная ссылка на профиль. 
        Она оборачивает и аватарку, и имя.
      */}
      <Link href="/profile" className="flex items-center gap-2 group">
        <div className="w-8 h-8 relative rounded-full overflow-hidden border border-neutral-700 group-hover:border-[#a78bfa] transition-all">
  {profile?.avatar_url ? (
    <Image 
      src={`${profile.avatar_url}?t=${new Date(profile.username || '').getTime()}`}
      alt="Аватар" 
      fill 
      sizes="32px"
      className="object-cover"
      unoptimized
      priority // <-- Загрузка без задержек в шапке
    />
  ) : (
    <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-xs text-[#34d399] font-bold">
      {profile?.username?.charAt(0)?.toUpperCase() || 'U'}
    </div>
  )}
</div>
        <span className="text-sm font-medium text-neutral-300 group-hover:text-white transition-colors">
          {profile?.username || 'Профиль'}
        </span>
      </Link>

      {/* Простая кнопка выхода (опционально, если у тебя настроен роут для выхода) */}
      <form action="/auth/signout" method="post">
        <button className="text-xs text-neutral-500 hover:text-red-400 transition-colors">
          Выйти
        </button>
      </form>
    </div>
  );
}