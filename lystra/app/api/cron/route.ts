import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('Крон временно заморожен до этапа интеграции с мобильным приложением (Expo).');
  
  // TODO: Колонки push_token, timezone и last_active_at уже есть в Prisma. 
  // Осталось написать логику рассылки через Expo Server SDK.
  
  return NextResponse.json({ success: true, message: 'Cron is paused', sentCount: 0 });
}