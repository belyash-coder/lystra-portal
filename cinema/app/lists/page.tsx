'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ListChecks, Plus, Loader2 } from 'lucide-react';
import type { MovieList } from '@/lib/types';

export default function ListsPage() {
  const [lists, setLists] = useState<MovieList[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  function load() {
    setLoading(true);
    fetch('/api/lists')
      .then((res) => res.json())
      .then((data) => setLists(data.lists ?? []))
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
  useEffect(load, []);

  async function createList() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        setNewName('');
        load();
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 flex items-center gap-2 text-xl font-bold text-lavender">
        <ListChecks size={22} />
        Мои списки
      </h1>

      <div className="mb-4 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createList()}
          placeholder="Название нового списка..."
          className="flex-1 rounded-full border border-white/10 bg-surface px-4 py-2 text-sm focus:border-lavender focus:outline-none"
        />
        <button
          onClick={createList}
          disabled={creating || !newName.trim()}
          className="flex items-center gap-1.5 rounded-full bg-lavender px-4 py-2 text-sm font-semibold text-black hover:bg-lavender-hover disabled:opacity-50"
        >
          <Plus size={16} />
          Создать
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-text-muted">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : lists.length === 0 ? (
        <p className="py-16 text-center text-text-muted">Списков пока нет — создайте первый выше.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {lists.map((list) => (
            <Link
              key={list.id}
              href={`/lists/${list.id}`}
              className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 hover:bg-surface-hover"
            >
              <span className="font-medium">{list.name}</span>
              <span className="text-sm text-text-muted">{list.movieCount} фильмов</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
