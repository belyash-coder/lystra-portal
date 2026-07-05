import Link from 'next/link';

export const metadata = {
  title: 'О проекте | LYSTRA',
  description: 'Узнайте больше о философии и миссии музыкального портала LYSTRA.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 md:p-12 font-sans selection:bg-[#a78bfa]/30">
      <div className="max-w-[800px] mx-auto space-y-12">
        
        {/* Навигация */}
        <Link href="/" className="text-sm text-neutral-400 hover:text-[#a78bfa] inline-block transition-colors font-medium">
          ← На главную
        </Link>

        {/* Заголовок */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter">
            Исследуй. <span className="text-[#a78bfa]">Слушай.</span> <span className="text-[#34d399]">Делись.</span>
          </h1>
          <p className="text-lg md:text-xl text-neutral-400 font-medium leading-relaxed">
            LYSTRA — это не просто портал. Это экосистема для тех, кто ищет музыкальное просветление за пределами мейнстрима.
          </p>
        </div>

        <hr className="border-white/10" />

        {/* Контент */}
        <div className="space-y-10 text-neutral-300 leading-relaxed">
          
          <section className="space-y-3 bg-white/5 p-6 md:p-8 rounded-2xl border border-white/5">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#a78bfa] shadow-[0_0_10px_rgba(167,139,250,0.5)]"></span>
              Наша философия
            </h2>
            <p>
              Мы строим комьюнити энтузиастов и исследователей, а не снобов или критиков. Проект создан для того, чтобы каждый мог совершать личные музыкальные открытия, погружаясь в независимую сцену, кинематографичную эстетику и редкие жанры. 
            </p>
          </section>

          <section className="space-y-3 bg-white/5 p-6 md:p-8 rounded-2xl border border-white/5">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#34d399] shadow-[0_0_10px_rgba(52,211,153,0.5)]"></span>
              Для независимых артистов
            </h2>
            <p>
              Мы даем артистам прямую связь со слушателями и удобные инструменты для публикации релизов. Здесь вашу музыку оценивают живые люди, а не бездушные алгоритмы корпоративных стримингов.
            </p>
          </section>

          <section className="space-y-3 bg-white/5 p-6 md:p-8 rounded-2xl border border-white/5">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-[#a78bfa] to-[#34d399]"></span>
              Геймификация и комьюнити
            </h2>
            <p>
              LYSTRA поощряет вашу активность. Оставляйте развернутые рецензии, добавляйте независимые релизы, общайтесь и зарабатывайте баллы. Ваша вовлеченность открывает новые звания и динамические рамки профиля, выделяя вас среди других слушателей.
            </p>
          </section>

          {/* Связь и поддержка */}
          <section className="pt-6">
            <h2 className="text-xl font-bold text-white mb-4">Связь и поддержка</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <a 
                href="mailto:lystra.app@gmail.com" 
                className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3.5 px-6 rounded-xl transition-all hover:border-[#a78bfa]/50 text-sm"
              >
                Связаться с нами
              </a>
              <a 
                href="#" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-[#34d399]/10 hover:bg-[#34d399]/20 border border-[#34d399]/30 text-[#34d399] font-bold py-3.5 px-6 rounded-xl transition-all text-sm"
              >
                Telegram-канал
              </a>
              <a 
                href="https://pay.cloudtips.ru/p/9624dc9c" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-[#a78bfa]/10 hover:bg-[#a78bfa]/20 border border-[#a78bfa]/30 text-[#a78bfa] font-bold py-3.5 px-6 rounded-xl transition-all hover:shadow-[0_0_15px_rgba(167,139,250,0.15)] text-sm"
              >
                Поддержать проект
              </a>
            </div>
          </section>

        </div>

        {/* Call to action */}
        <div className="pt-4 pb-12">
          <Link 
            href="/reviews" 
            className="inline-flex items-center justify-center bg-transparent border border-[#a78bfa]/50 hover:bg-[#a78bfa]/10 text-[#a78bfa] font-bold py-4 px-8 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(167,139,250,0.15)] w-full md:w-auto"
          >
            Перейти к общим отзывам →
          </Link>
        </div>

      </div>
    </div>
  );
}