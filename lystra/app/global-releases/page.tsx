import Link from "next/link";

export const revalidate = 3600; // Кешируем страницу на час, чтобы не спамить API Deezer

export default async function GlobalReleasesPage() {
  let releases = [];
  try {
    // Запрашиваем новинки. По умолчанию Deezer отдаст больше данных (около 50 релизов)
    const res = await fetch("https://api.deezer.com/editorial/0/releases?limit=50");
    const data = await res.json();
    releases = data.data || [];
  } catch (error) {
    console.error("Ошибка загрузки Deezer:", error);
  }

  return (
    <main className="min-h-screen bg-[#121212] text-white p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Навигация и заголовок */}
        <div className="flex flex-col gap-2">
          <Link href="/" className="text-neutral-400 hover:text-white transition-colors text-sm w-fit mb-4">
            ← Назад на главную
          </Link>
          <h1 className="text-4xl font-black">
            Все <span className="text-[#a78bfa]">мировые новинки</span>
          </h1>
        </div>

        {/* Сетка релизов */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {releases.map((album: any) => (
            <Link 
              href={`/album/${album.id}`} 
              key={album.id} 
              className="group cursor-pointer block"
            >
              <div className="relative aspect-square overflow-hidden rounded-lg mb-3 bg-neutral-900">
                <img 
                  src={album.cover_medium} 
                  alt={album.title} 
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h3 
                className="font-semibold text-sm truncate group-hover:text-[#34d399] transition-colors" 
                title={album.title}
              >
                {album.title}
              </h3>
              <p 
                className="text-xs text-neutral-400 truncate mt-1" 
                title={album.artist.name}
              >
                {album.artist.name}
              </p>
            </Link>
          ))}
          
          {releases.length === 0 && (
            <p className="text-neutral-500 col-span-full">Не удалось загрузить релизы.</p>
          )}
        </div>
      </div>
    </main>
  );
}