import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = req.query.id as string;

  if (!id) {
    return res.status(400).send('ID не найден');
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

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}