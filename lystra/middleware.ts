import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 1. Перехватываем ссылки на инвайт ДО срабатывания остальной логики
  if (pathname.startsWith('/invite') || pathname.startsWith('/api/invite')) {
    const id = searchParams.get('id');

    if (!id) {
      return new NextResponse('ID не найден', { status: 400 });
    }

    const html = `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Открываем LYSTRA...</title>
        <script>
          window.onload = function() {
            window.location.href = "lystra-app://profile/${id}";
          };
        </script>
      </head>
      <body style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #000000; color: #ffffff; font-family: sans-serif; margin: 0;">
        <h1 style="color: #A78BFA; margin-bottom: 16px; letter-spacing: 4px; font-size: 32px; font-weight: 900;">LYSTRA</h1>
        <p style="color: #9CA3AF; margin-bottom: 32px; font-size: 16px;">Открываем приложение...</p>
        
        <a href="lystra-app://profile/${id}" style="padding: 16px 32px; background-color: #6EE7B7; color: #000000; border-radius: 16px; text-decoration: none; font-weight: bold; font-size: 16px;">
          Открыть вручную
        </a>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // 1. Устанавливаем куки во входящем запросе
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          
          // 2. Пересобираем объект ответа
          supabaseResponse = NextResponse.next({
            request,
          })
          
          // 3. Устанавливаем куки в исходящем ответе
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith('/releases/publish')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}