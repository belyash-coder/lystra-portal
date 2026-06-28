import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ProfileRedirectPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Если не авторизован - кидаем на главную
  if (!user) {
    redirect('/'); 
  }

  // Мгновенно перекидываем пользователя на его полноценную страницу профиля с ID
  redirect(`/profile/${user.id}`);
}