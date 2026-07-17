import { NextResponse, type NextRequest } from 'next/server'

// Эндпоинты, которыми пользуется Telegram Mini App — она живёт на отдельном
// домене, поэтому нужны CORS-заголовки. Авторизация здесь — Bearer-токен
// (не cookie), так что открытый Access-Control-Allow-Origin безопасен:
// сторонний сайт не может ни прочитать, ни подставить чужой токен сам.
const CORS_PATHS = ['/api/tg/', '/api/favorites', '/api/genres/', '/api/spotify-mix', '/api/mobile/profile']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const needsCors = CORS_PATHS.some((p) => pathname.startsWith(p))

  if (needsCors) {
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      })
    }

    const response = NextResponse.next()
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return response
  }

  // Временно пропускаем все запросы
  // Позже здесь будет подключена защита роутов через NextAuth (auth.ts)
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|invite|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}