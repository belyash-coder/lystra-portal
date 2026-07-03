import { createClient } from "@/lib/supabase/server";
import CustomAudioPlayer from "@/components/CustomAudioPlayer";
import GenreSidebar from "@/components/GenreSidebar";
import Link from "next/link";

export const revalidate = 0;

export default async function AllReleasesPage({
  searchParams,
}: {
  searchParams: { genre?: string };
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const genre = params?.genre;

  // Формируем базовый запрос
  let query = supabase
    .from("tracks")
    .select(`
      id,
      title,
      audio_path,
      duration,
      releases!inner (
        id,
        cover_path,
        genre,
        artists (
          stage_name
        )
      )
    `)
    .order("created_at", { ascending: false });

  // Применяем фильтр, если жанр выбран
  if (genre) {
    query = query.ilike('releases.genre', `%${genre}%`);
  }

  const { data: tracks } = await query;

  return (
    <div className="min-h-screen bg-[#121212] text-white py-8 md:py-12">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 flex flex-col md:flex-row gap-8 lg:gap-20 xl:gap-24">
        
        {/* Левая колонка: Заголовок и Сайдбар (С прилипанием) */}
        <div className="w-full md:w-[250px] lg:w-[280px] flex-shrink-0">
          <div className="sticky top-24 z-40 space-y-8">
            <div>
              <h1 className="text-4xl font-black mb-2 text-[#34d399]">Инди-радар</h1>
              <p className="text-sm text-neutral-400 leading-relaxed mb-6">Все независимые релизы на LYSTRA.</p>

              <Link 
                href="/add-indie" 
                className="inline-flex items-center justify-center w-full bg-[#a78bfa] hover:bg-[#906ffa] text-black font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-[#a78bfa]/10"
              >
                + Добавить релиз
              </Link>
            </div>
            
            <GenreSidebar currentGenre={genre} />
          </div>
        </div>

        {/* Правая колонка: Список треков */}
        <div className="flex-grow space-y-4 min-w-0 md:pt-[104px]">
          {tracks?.map((track: any) => {
            const release = track.releases;
            const coverUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/release_covers/${release?.cover_path}`;
            const audioUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/audio_files/${track.audio_path}`;

            return (
              <div key={track.id} className="bg-[#1a1a1a] p-4 rounded-xl border border-neutral-800 flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <img src={coverUrl} alt="cover" className="w-14 h-14 rounded-lg object-cover bg-neutral-800 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-lg text-white">{track.title}</h3>
                    <p className="text-sm text-[#a78bfa]">{release?.artists?.stage_name || "Неизвестный артист"}</p>
                  </div>
                  <span className="ml-auto text-xs font-mono text-neutral-500 bg-[#121212] px-2 py-1 rounded border border-neutral-800">
                    {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                
                {/* Наш обновленный кастомный плеер со всеми типами */}
                <CustomAudioPlayer src={audioUrl || ""} initialDuration={track?.duration || 0} />
              </div>
            );
          })}

          {!tracks?.length && (
            <p className="text-neutral-500 text-sm text-center py-12 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/20">
              В этом жанре пока пусто. Ждем новые релизы!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}