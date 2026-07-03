import Link from "next/link";
import GenreSidebar from "@/components/GenreSidebar";
import GlobalReleasesGrid from "@/components/GlobalReleasesGrid";

export const revalidate = 0; 

export default async function GlobalReleasesPage({
  searchParams,
}: {
  searchParams: { genre?: string };
}) {
  const params = await searchParams;
  const genre = params?.genre;

  let releases = [];
  try {
    const deezerGenreMap: Record<string, number> = {
      "Electronic": 106,
      "Rock": 152,
      "Hip-Hop": 116,
      "Pop": 132,
      "R&B": 165,
      "Jazz": 129,
      "Classical": 98,
      "Alternative": 85,
      "Metal": 464,
      "Indie": 85, 
      "Ambient": 106, 
      "Folk": 466
    };
    
    // Если жанр выбран — используем его ID, иначе 0 (все жанры)
    const deezerId = genre && deezerGenreMap[genre] ? deezerGenreMap[genre] : 0;
    
    const res = await fetch(`https://api.deezer.com/editorial/${deezerId}/releases?limit=50`);
    const data = await res.json();
    releases = data.data || [];
  } catch (error) {
    console.error("Ошибка загрузки Deezer:", error);
  }

  return (
    <main className="min-h-screen bg-[#121212] text-white py-8 md:py-12 font-sans">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 flex flex-col md:flex-row gap-8 lg:gap-20 xl:gap-24">
        
        {/* Левая колонка: Сайдбар (с отступом для выравнивания по линии карточек) */}
        <div className="w-full md:w-[250px] lg:w-[280px] flex-shrink-0 md:pt-[104px]">
          <div className="sticky top-24 z-40 space-y-8">
            <GenreSidebar currentGenre={genre} basePath="/global-releases" />
          </div>
        </div>

        {/* Правая колонка: Заголовок и Сетка релизов */}
        <div className="flex-grow min-w-0">
          
          <div className="flex flex-col gap-2 mb-8">
            <Link href="/" className="text-neutral-400 hover:text-white transition-colors text-sm w-fit mb-4">
              ← Назад на главную
            </Link>
            <h1 className="text-4xl font-black">
              Все <span className="text-[#a78bfa]">мировые новинки</span>
            </h1>
          </div>

          <GlobalReleasesGrid initialReleases={releases} />
      </div>
      </div>
    </main>
  );
}