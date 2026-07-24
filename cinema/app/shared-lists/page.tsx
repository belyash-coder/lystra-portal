'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users2, Plus, Loader2, Trash2 } from 'lucide-react';
import { sharedListPartnerLabel, type SharedListSummary } from '@/lib/types';

export default function SharedListsPage() {
  const [lists, setLists] = useState<SharedListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch('/api/shared-lists')
      .then((res) => res.json())
      .then((data) => setLists(data.lists ?? []))
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
  useEffect(load, []);

  async function createList() {
    if (!username.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/shared-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerUsername: username.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Не удалось создать список');
        return;
      }
      setUsername('');
      load();
    } finally {
      setCreating(false);
    }
  }

  async function removeList(id: string) {
    if (!confirm('Удалить совместный список для обоих участников?')) return;
    setRemovingId(id);
    try {
      await fetch(`/api/shared-lists/${id}`, { method: 'DELETE' });
      setLists((prev) => prev.filter((l) => l.id !== id));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div>
      <h1 className="mb-4 flex items-center gap-2 text-xl font-bold text-lavender">
        <Users2 size={22} />
        Совместные списки
      </h1>

      <div className="mb-2 flex gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createList()}
          placeholder="@username второго человека"
          className="flex-1 rounded-full border border-white/10 bg-surface px-4 py-2 text-sm focus:border-lavender focus:outline-none"
        />
        <button
          onClick={createList}
          disabled={creating || !username.trim()}
          className="flex items-center gap-1.5 rounded-full bg-lavender px-4 py-2 text-sm font-semibold text-black hover:bg-lavender-hover disabled:opacity-50"
        >
          {creating ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
          Пригласить
        </button>
      </div>
      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
      <p className="mb-4 text-xs text-text-muted">
        Пригласить можно только того, кто уже хотя бы раз открывал это приложение.
      </p>

      {loading ? (
        <div className="flex justify-center py-16 text-text-muted">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : lists.length === 0 ? (
        <p className="py-16 text-center text-text-muted">Совместных списков пока нет — пригласите кого-нибудь выше.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {lists.map((list) => (
            <div key={list.id} className="flex items-center gap-2 rounded-xl bg-surface px-4 py-3">
              <Link href={`/shared-lists/${list.id}`} className="flex flex-1 items-center justify-between">
                <span className="font-medium">Смотреть вместе с {sharedListPartnerLabel(list.partner)}</span>
                <span className="text-sm text-text-muted">{list.movieCount} фильмов</span>
              </Link>
              <button
                onClick={() => removeList(list.id)}
                disabled={removingId === list.id}
                className="flex items-center justify-center rounded-lg bg-background px-2.5 py-2 text-red-400 hover:bg-surface-hover disabled:opacity-60"
                aria-label="Удалить список"
              >
                {removingId === list.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
