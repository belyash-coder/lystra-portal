import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function ProfileRedirectPage() {
  const session = await auth();
  const user = session?.user;

  // Если не авторизован - кидаем на главную
  if (!user?.id) {
    redirect('/'); 
  }

  // Получаем username для формирования ссылки
  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: { username: true }
  });

  // Перекидываем пользователя на страницу с никнеймом
  if (profile?.username) {
    redirect(`/profile/${profile.username}`);
  } else {
    // Резервный вариант, если никнейм не установлен
    redirect(`/profile/${user.id}`);
  }
}