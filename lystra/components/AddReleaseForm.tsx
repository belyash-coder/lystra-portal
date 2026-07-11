'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TagPicker from './TagPicker';

const AVAILABLE_GENRES = [
  'Electronic', 'Rock', 'Metal', 'Alternative', 'Hip-Hop/Rap', 'Experimental',
  'Punk', 'Folk', 'Pop', 'Ambient', 'Soundtrack', 'World', 'Jazz', 'Acoustic',
  'Funk', 'R&B/Soul', 'Devotional', 'Classical', 'Reggae', 'Country', 'Blues', 'Latin'
];

export default function AddReleaseForm() {
  const [url, setUrl] = useState('');
  const [genre, setGenre] = useState(AVAILABLE_GENRES[0]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/parse-release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, genre, tags }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Не удалось сохранить релиз');
      }

      // Освежаем данные на главной странице и перенаправляем на радар
      router.refresh();
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="space-y-5">
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

        <div>
          <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-2">
            Выберите основной жанр
          </label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#a78bfa] transition-colors text-sm cursor-pointer"
          >
            {AVAILABLE_GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <TagPicker selectedTags={tags} onChange={setTags} />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#a78bfa] hover:bg-[#906ffa] disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-[#a78bfa]/10 flex items-center justify-center"
        >
          {loading ? 'Импортируем и сохраняем...' : 'Опубликовать на LYSTRA'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-950/30 border border-red-900/50 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}