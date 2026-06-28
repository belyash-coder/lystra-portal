import { createClient } from "@/lib/supabase/server";
import CustomAudioPlayer from "@/components/CustomAudioPlayer";

export const revalidate = 0;

export default async function AllReleasesPage() {
  const supabase = await createClient();

  // Подтягиваем треки, обложки релизов и имена артистов из связанных таблиц
  const { data: tracks } = await supabase
    .from("tracks")
    .select(`
      id,
      title,
      audio_path,
      duration,
      releases (
        id,
        cover_path,
        genre,
        artists (
          stage_name
        )
      )
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8 md:p-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black mb-2 text-[#34d399]">Инди-радар</h1>
        <p className="text-neutral-400 mb-8">Все независимые релизы на LYSTRA.</p>

        <div className="space-y-4">
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
              На инди-сцене пока пусто. Загрузите первый релиз через Студию!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}