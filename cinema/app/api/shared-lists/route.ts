import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentProfile } from '@/lib/auth';

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const memberships = await prisma.sharedListMember.findMany({
    where: { profileId: profile.id },
    orderBy: { joinedAt: 'asc' },
    include: {
      sharedList: {
        include: {
          members: { include: { profile: { select: { username: true, firstName: true } } } },
          _count: { select: { entries: true } },
        },
      },
    },
  });

  const lists = memberships.map(({ sharedList }) => {
    const partnerMember = sharedList.members.find((m) => m.profileId !== profile.id);
    return {
      id: sharedList.id,
      partner: partnerMember
        ? { username: partnerMember.profile.username, firstName: partnerMember.profile.firstName }
        : null,
      movieCount: sharedList._count.entries,
    };
  });

  return NextResponse.json({ lists });
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  const { partnerUsername } = await request.json();
  const cleanUsername = typeof partnerUsername === 'string' ? partnerUsername.trim().replace(/^@/, '') : '';
  if (!cleanUsername) {
    return NextResponse.json({ message: 'Укажите username' }, { status: 400 });
  }

  const partner = await prisma.profile.findFirst({
    where: { username: { equals: cleanUsername, mode: 'insensitive' } },
  });
  if (!partner) {
    return NextResponse.json(
      { message: 'Пользователь не найден — он должен хотя бы раз открыть приложение' },
      { status: 404 }
    );
  }
  if (partner.id === profile.id) {
    return NextResponse.json({ message: 'Нельзя пригласить самого себя' }, { status: 400 });
  }

  const sharedList = await prisma.sharedList.create({
    data: {
      createdById: profile.id,
      members: { create: [{ profileId: profile.id }, { profileId: partner.id }] },
    },
  });

  return NextResponse.json(
    {
      list: {
        id: sharedList.id,
        partner: { username: partner.username, firstName: partner.firstName },
        movieCount: 0,
      },
    },
    { status: 201 }
  );
}
