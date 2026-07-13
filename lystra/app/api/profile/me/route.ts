import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ xp: 0 });
  }

  const profile = await prisma.profiles.findUnique({
    where: { id: session.user.id as string },
    select: { xp: true, title: true },
  });

  return NextResponse.json({ xp: profile?.xp ?? 0, title: profile?.title ?? 'Новичок' });
}
