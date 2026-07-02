import { NextRequest, NextResponse } from 'next/server';

// КРИТИЧЕСКИ ВАЖНО: отключает статическую генерацию на этапе сборки Vercel, предотвращая 404 и краши
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Получаем параметры из URL
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  // Безопасный фоллбэк, если id вдруг не передали
  const profileId = id || '';

  // Формируем HTML-страницу
  const html = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LYSTRA</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #121212;
          color: #E6E6FA;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .container {
          text-align: center;
          padding: 20px;
        }
        a {
          color: #98FF98;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Загрузка профиля...</h2>
        <p>Если приложение не открылось автоматически, нажмите <a href="lystra-app://profile/${profileId}">сюда</a>.</p>
      </div>
      
      <script>
        // Непосредственный редирект (deep link) в мобильное приложение
        window.location.href = "lystra-app://profile/${profileId}";
      </script>
    </body>
    </html>
  `;

  // Отдаем HTML с правильными заголовками
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}