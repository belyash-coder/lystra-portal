"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// Инициализация Supabase (убедитесь, что переменные окружения настроены)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function NewReleasePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [formData, setFormData] = useState({
    artist_name: "",
    title: "",
    cover_url: "",
    stream_url: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    const { error } = await supabase
      .from("releases")
      .insert([formData]);

    if (error) {
      setMessage({ type: "error", text: "Ошибка при добавлении релиза. Проверьте данные." });
      console.error(error);
    } else {
      setMessage({ type: "success", text: "Релиз успешно добавлен!" });
      setFormData({ artist_name: "", title: "", cover_url: "", stream_url: "" });
      // Опционально: редирект на страницу релиза или профиля
      // router.push("/profile");
    }
    
    setIsSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-[#121212] text-white p-8 font-sans">
      <div className="max-w-2xl mx-auto mt-12">
        <h1 className="text-4xl font-bold mb-2">
          Опубликовать <span className="text-[#a78bfa]">релиз</span>
        </h1>
        <p className="text-neutral-400 mb-8">
          Поделитесь своей музыкой с сообществом LYSTRA. Поддерживаются ссылки на SoundCloud, YouTube и Bandcamp.
        </p>

        {message.text && (
          <div className={`p-4 mb-6 rounded border ${
            message.type === "success" 
              ? "bg-[#064e3b] border-[#34d399] text-[#a7f3d0]" 
              : "bg-red-900 border-red-500 text-red-200"
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
          
          <div className="flex flex-col gap-1">
            <label htmlFor="artist_name" className="text-sm font-medium text-neutral-300">
              Имя артиста *
            </label>
            <input
              type="text"
              id="artist_name"
              name="artist_name"
              required
              value={formData.artist_name}
              onChange={handleChange}
              placeholder="Например: Daft Punk"
              className="bg-[#1a1a1a] border border-neutral-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#a78bfa] focus:ring-1 focus:ring-[#a78bfa] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="title" className="text-sm font-medium text-neutral-300">
              Название релиза *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              placeholder="Например: Random Access Memories"
              className="bg-[#1a1a1a] border border-neutral-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#a78bfa] focus:ring-1 focus:ring-[#a78bfa] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="cover_url" className="text-sm font-medium text-neutral-300">
              Ссылка на обложку
            </label>
            <input
              type="url"
              id="cover_url"
              name="cover_url"
              value={formData.cover_url}
              onChange={handleChange}
              placeholder="https://example.com/cover.jpg"
              className="bg-[#1a1a1a] border border-neutral-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#a78bfa] focus:ring-1 focus:ring-[#a78bfa] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="stream_url" className="text-sm font-medium text-neutral-300">
              Ссылка на стриминг (SoundCloud, YouTube, Bandcamp) *
            </label>
            <input
              type="url"
              id="stream_url"
              name="stream_url"
              required
              value={formData.stream_url}
              onChange={handleChange}
              placeholder="https://soundcloud.com/..."
              className="bg-[#1a1a1a] border border-neutral-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#34d399] focus:ring-1 focus:ring-[#34d399] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#34d399] hover:bg-[#10b981] text-[#121212] font-bold text-lg py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {isSubmitting ? "Публикация..." : "Опубликовать релиз"}
          </button>
        </form>
      </div>
    </main>
  );
}