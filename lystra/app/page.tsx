// Вместо сайта — одна страница со ссылкой на бота (где живёт Mini App).
// Имя бота — та же переменная окружения, что и для ссылок в рассылках.
export const dynamic = "force-dynamic";

export default function Home() {
  const bot = process.env.TELEGRAM_BOT_USERNAME;
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="text-4xl font-black tracking-wider leading-none">
        <span className="text-[#a78bfa]">LY</span>
        <span className="text-[#34d399]">ST</span>
        <span className="text-[#a78bfa]">RA</span>
      </div>
      <p className="text-neutral-300 max-w-sm">
        Музыкальная рулетка жанров — теперь в Telegram.
      </p>
      {bot && (
        <a
          href={`https://t.me/${bot}`}
          className="rounded-full bg-[#a78bfa] px-6 py-3 font-semibold text-black hover:opacity-90"
        >
          Открыть в Telegram
        </a>
      )}
    </main>
  );
}
