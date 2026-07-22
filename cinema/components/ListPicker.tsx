'use client';

import { useState } from 'react';
import { Plus, ListPlus } from 'lucide-react';
import type { MovieList } from '@/lib/types';

export function ListPicker({
  movieId,
  lists,
  listIds,
  onListsChange,
  onMembershipChange,
}: {
  movieId: string;
  lists: MovieList[];
  listIds: string[];
  onListsChange: (lists: MovieList[]) => void;
  onMembershipChange: (listIds: string[]) => void;
}) {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  async function toggle(listId: string, checked: boolean) {
    onMembershipChange(checked ? [...listIds, listId] : listIds.filter((id) => id !== listId));
    if (checked) {
      await fetch(`/api/movies/${movieId}/lists`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId }),
      });
    } else {
      await fetch(`/api/movies/${movieId}/lists?listId=${listId}`, { method: 'DELETE' });
    }
  }

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
        const data = await res.json();
        onListsChange([...lists, data.list]);
        setNewName('');
        await toggle(data.list.id, true);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="rounded-xl bg-surface p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-muted">
        <ListPlus size={16} />
        Добавить в список
      </h3>
      <div className="flex flex-col gap-2">
        {lists.map((list) => (
          <label key={list.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={listIds.includes(list.id)}
              onChange={(e) => toggle(list.id, e.target.checked)}
            />
            {list.name}
            <span className="text-xs text-text-muted">({list.movieCount})</span>
          </label>
        ))}
        {lists.length === 0 && <p className="text-xs text-text-muted">Списков пока нет — создайте первый.</p>}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createList()}
          placeholder="Новый список..."
          className="flex-1 rounded-lg border border-white/10 bg-background px-3 py-1.5 text-sm focus:border-lavender focus:outline-none"
        />
        <button
          onClick={createList}
          disabled={creating || !newName.trim()}
          className="flex items-center gap-1 rounded-lg bg-lavender px-3 py-1.5 text-xs font-semibold text-black hover:bg-lavender-hover disabled:opacity-50"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
