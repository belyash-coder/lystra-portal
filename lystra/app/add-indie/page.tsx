import { AddReleaseForm } from "@/components/AddReleaseForm";
import Link from "next/link";

export default function AddIndiePage() {
  return (
    <div className="min-h-screen bg-[#121212] text-white py-8 md:py-12">
      <div className="max-w-2xl mx-auto px-6">
        <Link 
          href="/" 
          className="text-sm text-[#a78bfa] hover:underline mb-6 inline-block transition-colors"
        >
          ← Назад в Инди-радар
        </Link>
        
        <h1 className="text-3xl font-black mb-2 text-[#34d399]">Добавить независимый релиз</h1>
        <p className="text-sm text-neutral-400 mb-8">
          Вставьте ссылку на трек или альбом с Bandcamp / SoundCloud, выберите жанр, и мы автоматически добавим его на радар.
        </p>

        <AddReleaseForm />
      </div>
    </div>
  );
}