import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ProfileRedirectPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Если не авторизован - кидаем на главную
  if (!user) {
    redirect('/'); 
  }

  // Получаем username для формирования ссылки
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  // Перекидываем пользователя на страницу с никнеймом
  if (profile?.username) {
    redirect(`/profile/${profile.username}`);
  } else {
    // Резервный вариант, если никнейм не установлен
    redirect(`/profile/${user.id}`);
  }
}