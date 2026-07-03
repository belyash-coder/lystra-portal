import Link from "next/link";
import { ArrowLeft, Headphones } from "lucide-react";

export default function NewReleasePage() {
  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-neutral-900/40 p-10 rounded-2xl border border-[#a78bfa]/20 max-w-md w-full flex flex-col items-center shadow-lg">
        <Headphones className="w-12 h-12 text-[#a78bfa] mb-6" />
        <h1 className="text-2xl font-bold text-white mb-3">Загрузка отключена</h1>
        <p className="text-neutral-400 mb-8 leading-relaxed">
          Мы перешли на новую архитектуру. Прямая загрузка аудиофайлов больше не поддерживается. Совсем скоро здесь появится настройка синхронизации ваших релизов из Bandcamp и SoundCloud.
        </p>
        <Link 
          href="/studio" 
          className="flex items-center justify-center gap-2 w-full bg-[#1a1a1a] text-white border border-neutral-700 hover:border-[#34d399] px-6 py-3 rounded-xl transition-all font-medium hover:text-[#34d399]"
        >
          <ArrowLeft className="w-4 h-4" /> Вернуться в Студию
        </Link>
      </div>
    </div>
  );
}