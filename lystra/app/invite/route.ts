import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Получаем ID из ссылки
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new NextResponse('ID не найден', { status: 400 });
  }

  // Формируем чистый HTML
  const html = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Открываем LYSTRA...</title>
      <script>
        // Браузер автоматически попытается открыть приложение
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

  // Отправляем как веб-страницу
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}