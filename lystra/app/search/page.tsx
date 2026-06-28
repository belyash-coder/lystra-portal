"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

function SearchContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(urlQuery);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (urlQuery.trim()) {
      performSearch(urlQuery);
    } else {
      setResults([]);
    }
  }, [urlQuery]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setResults(data.data?.slice(0, 12) || []);
    } catch (error) {
      console.error("Ошибка поиска:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const params = new URLSearchParams(searchParams);
    params.set("q", query);
    router.push(`${pathname}?${params.toString()}`);
  };

  // Функция быстрой очистки
  const handleClear = () => {
    setQuery("");
    router.push(pathname); // Сбрасываем URL, что автоматически очистит результаты благодаря useEffect
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8 mt-8">
      <h1 className="text-4xl md:text-6xl font-black text-center mb-4">
        Поиск <span className="text-[#a78bfa]">артистов</span>
      </h1>

      <form onSubmit={handleSearch} className="w-full flex flex-col sm:flex-row gap-4">
        {/* Обертка для инпута и крестика */}
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Например: Radiohead, Burial, Скриптонит..."
            // focus:placeholder-transparent прячет текст при установке курсора
            // Увеличили pr-14, чтобы текст не залезал под крестик
            className="w-full bg-neutral-900/80 border-2 border-neutral-800 rounded-full pl-8 pr-14 py-4 text-white focus:outline-none focus:border-[#a78bfa] transition-colors shadow-lg text-lg placeholder-neutral-500 focus:placeholder-transparent"
          />
          
          {/* Крестик очистки появляется только если в поле есть текст */}
          {query.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-[#a78bfa] p-2 transition-colors focus:outline-none"
              title="Очистить поиск"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-[#a78bfa] text-[#121212] px-10 py-4 rounded-full font-bold hover:bg-[#9061f9] hover:scale-105 transition-all disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center min-w-[140px]"
        >
          {loading ? (
            <svg className="animate-spin h-6 w-6 text-[#121212]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            "Найти"
          )}
        </button>
      </form>

      <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {results.length === 0 && !loading && urlQuery && (
          <div className="col-span-full text-neutral-500 text-center bg-neutral-900/30 p-12 rounded-3xl border border-neutral-800 border-dashed">
            Артисты не найдены.
          </div>
        )}

        {results.length === 0 && !loading && !urlQuery && (
          <div className="col-span-full text-neutral-500 text-center bg-neutral-900/30 p-12 rounded-3xl border border-neutral-800 border-dashed">
            Введи имя музыканта или группы, чтобы начать исследование.
          </div>
        )}

        {results.map((artist) => (
          <Link
            href={`/artist/${artist.id}`}
            key={artist.id}
            className="bg-neutral-900/40 p-6 rounded-3xl flex flex-col items-center gap-4 border border-neutral-800 hover:border-[#a78bfa]/50 hover:bg-neutral-900/80 transition-all group cursor-pointer"
          >
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-transparent group-hover:border-[#a78bfa] transition-all duration-300 shadow-xl">
              <img
                src={artist.picture_medium || "https://e-cdns-images.dzcdn.net/images/artist//250x250-000000-80-0-0.jpg"}
                alt={artist.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            
            <div className="text-center w-full overflow-hidden flex-1 flex flex-col justify-center">
              <h3 className="font-bold text-lg truncate group-hover:text-[#34d399] transition-colors">
                {artist.name}
              </h3>
              <p className="text-neutral-500 text-sm mt-1 uppercase tracking-wider text-[10px] font-semibold">
                Исполнитель
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 md:p-12 font-sans">
      <Suspense fallback={
        <div className="flex justify-center items-center h-[50vh]">
          <div className="animate-spin h-10 w-10 border-4 border-[#a78bfa] border-t-transparent rounded-full" />
        </div>
      }>
        <SearchContent />
      </Suspense>
    </div>
  );
}