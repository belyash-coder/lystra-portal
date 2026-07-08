import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Временно пропускаем все запросы
  // Позже здесь будет подключена защита роутов через NextAuth (auth.ts)
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|invite|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}