import GenreSidebar from "@/components/GenreSidebar";
import Link from "next/link";
import IndieReleasesGrid from "@/components/IndieReleasesGrid";

export const revalidate = 0;

export default async function AllReleasesPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  const params = await searchParams;
  const genre = params?.genre;

  // ВАЖНО: Таблицы tracks, releases и artists были удалены из БД.
  // Возвращаем пустой массив, чтобы не сломать сетку релизов (IndieReleasesGrid), 
  // пока вы не переведете получение музыки на внешнее API.
  const tracks: any[] = [];

  return (
    <div className="min-h-screen bg-[#121212] text-white py-8 md:py-12">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 flex flex-col md:flex-row gap-8 lg:gap-20 xl:gap-24">
        
        {/* Левая колонка: Сайдбар (С прилипанием) */}
        <div className="w-full md:w-[250px] lg:w-[280px] flex-shrink-0">
          <div className="sticky top-24 z-40">
            <GenreSidebar currentGenre={genre} />
          </div>
        </div>

        {/* Правая колонка: Заголовок и Сетка релизов */}
        <div className="flex-grow min-w-0">
          <div className="mb-8">
            <Link href="/" className="text-sm text-neutral-400 hover:text-white mb-6 inline-block transition-colors">
              ← Назад на главную
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <h1 className="text-4xl font-black mb-2 text-[#34d399]"><span className="text-white">Вся</span> независимая сцена</h1>
              </div>
              <Link 
                href="/add-indie" 
                className="inline-flex items-center justify-center bg-[#a78bfa] hover:bg-[#906ffa] text-black font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-[#a78bfa]/10 whitespace-nowrap"
              >
                + Добавить релиз
              </Link>
            </div>
          </div>

          <IndieReleasesGrid initialTracks={tracks} />
        </div>
      </div>
    </div>
  );
}