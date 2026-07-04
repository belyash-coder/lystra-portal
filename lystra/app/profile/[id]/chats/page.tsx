import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChatList } from '@/components/ChatList';

export const revalidate = 0;

export default async function FullChatsPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const resolvedParams = await params;
  const targetUsername = decodeURIComponent(resolvedParams.id);

  // Находим профиль в базе данных
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', targetUsername)
    .single();

  if (!profile) {
    return <div className="p-12 text-center text-white">Профиль не найден</div>;
  }

  // Защита: просматривать список диалогов может только его непосредственный владелец
  if (user.id !== profile.id) {
    redirect(`/profile/${profile.username}`);
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white p-4 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Кнопка возврата */}
        <div>
          <Link 
            href={`/profile/${profile.username}`} 
            className="inline-flex items-center gap-2 text-neutral-400 hover:text-sky-400 transition-colors text-sm font-medium group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Назад в профиль
          </Link>
        </div>

        {/* Заголовок */}
        <div className="flex items-end gap-3 border-b border-white/10 pb-4">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <span className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-sky-400"></span>
            Список диалогов
          </h1>
        </div>

        {/* Рендерим тот же ChatList, но уже без лимита */}
        <div className="pt-4">
          <ChatList currentUserId={user.id} username={profile.username || ''} />
        </div>

      </div>
    </div>
  );
}