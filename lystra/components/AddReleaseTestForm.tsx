'use client';

import { useState } from 'react';

// Список жанров для теста (можешь заменить на свои, используемые в фильтре)
const AVAILABLE_GENRES = ['Electronic', 'Ambient', 'Synthwave', 'Lo-Fi', 'Rock', 'Hip-Hop', 'Jazz'];

export function AddReleaseTestForm() {
  const [url, setUrl] = useState('');
  const [genre, setGenre] = useState(AVAILABLE_GENRES[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/parse-release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, genre }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Что-то пошло не так');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800 backdrop-blur-sm">
      <h3 className="text-xl font-bold mb-6 text-white">Тест добавления инди-релиза</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Поле ввода URL */}
        <div>
          <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-2">
            Ссылка на Bandcamp или SoundCloud
          </label>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://bandcamp.com/... или https://soundcloud.com/..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#a78bfa] transition-colors text-sm"
          />
        </div>

        {/* Поле выбора Жанра */}
        <div>
          <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-2">
            Укажите жанр (для фильтрации)
          </label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#a78bfa] transition-colors text-sm appearance-none cursor-pointer"
          >
            {AVAILABLE_GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Кнопка отправки */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#a78bfa] hover:bg-[#906ffa] disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-[#a78bfa]/10 flex items-center justify-center"
        >
          {loading ? 'Сканируем страницу...' : 'Проверить и распарсить'}
        </button>
      </form>

      {/* Вывод ошибки */}
      {error && (
        <div className="mt-6 p-4 bg-red-950/30 border border-red-900/50 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Вывод результата успешного парсинга */}
      {result && (
        <div className="mt-6 p-6 bg-zinc-950 border border-zinc-800 rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-[#34d399] font-medium text-sm">
            <span>✓ Успешно распарсено ({result.source})</span>
          </div>

          <div className="flex gap-4">
            {result.cover_url && (
              <img 
                src={result.cover_url} 
                alt="Parsed Cover" 
                className="w-20 h-20 rounded-xl object-cover border border-zinc-800 shrink-0"
              />
            )}
            <div className="space-y-1">
              <h4 className="text-white font-bold text-lg">{result.title}</h4>
              <p className="text-zinc-400 text-sm">Артист: <span className="text-white">{result.artist_name}</span></p>
              <p className="text-zinc-400 text-sm">Жанр в фильтре: <span className="text-[#34d399] font-medium">{result.genre}</span></p>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800/60">
            <p className="text-xs text-zinc-500 font-mono break-all bg-zinc-900 p-3 rounded-lg">
              Данные готовые для отправки в Supabase:<br/>
              {JSON.stringify(result, null, 2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}