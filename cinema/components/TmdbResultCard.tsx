'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ListPlus, Loader2, X } from 'lucide-react';
import type { MovieList, TmdbListItem } from '@/lib/types';

function formatVotes(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
}

export function TmdbResultCard({ item }: { item: TmdbListItem }) {
  const router = useRouter();
  const [added, setAdded] = useState(item.inLibrary);
  const [movieId, setMovieId] = useState<string | null>(item.libraryMovieId);
  const [lists, setLists] = useState<MovieList[] | null>(null);
  const [listIds, setListIds] = useState<string[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loadingPanel, setLoadingPanel] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [newListName, setNewListName] = useState('');

  async function ensureCatalogued(): Promise<string | null> {
    if (movieId) return movieId;
    const res = await fetch('/api/tmdb/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId: item.tmdbId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const id = data.movieId as string | undefined;
    if (!id) return null;
    setMovieId(id);
    return id;
  }

  async function openDetail() {
    setNavigating(true);
    try {
      const id = await ensureCatalogued();
      if (id) router.push(`/movie/${id}`);
    } finally {
      setNavigating(false);
    }
  }

  async function ensureAdded(): Promise<string | null> {
    const res = await fetch('/api/movies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId: item.tmdbId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const id = data.movie?.id as string | undefined;
    if (!id) return null;
    setMovieId(id);
    setAdded(true);
    return id;
  }

  async function openPanel() {
    setLoadingPanel(true);
    try {
      const id = await ensureAdded();
      if (!id) return;
      if (lists === null) {
        const [listsData, movieData] = await Promise.all([
          fetch('/api/lists').then((res) => res.json()),
          fetch(`/api/movies/${id}`).then((res) => res.json()),
        ]);
        setLists(listsData.lists ?? []);
        setListIds(movieData.movie?.listIds ?? []);
      }
      setPanelOpen(true);
    } finally {
      setLoadingPanel(false);
    }
  }

  async function toggleList(listId: string, checked: boolean) {
    if (!movieId) return;
    setListIds((prev) => (checked ? [...prev, listId] : prev.filter((id) => id !== listId)));
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
    if (!newListName.trim()) return;
    const res = await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newListName.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setLists((prev) => [...(prev ?? []), data.list]);
      setNewListName('');
      await toggleList(data.list.id, true);
    }
  }

  async function removeFromLibrary() {
    if (!movieId) return;
    if (!confirm(`Удалить «${item.title}» из библиотеки?`)) return;
    setRemoving(true);
    try {
      await fetch(`/api/movies/${movieId}`, { method: 'DELETE' });
      setAdded(false);
      setListIds([]);
      setPanelOpen(false);
    } finally {
      setRemoving(false);
    }
  }

  const hasExternalRatings = item.imdbRating != null || item.kpRating != null;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-surface shadow-lg">
      <button onClick={openDetail} disabled={navigating} className="relative block aspect-[2/3] w-full bg-neutral-900 text-left">
        {item.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.posterUrl} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-text-muted">
            {item.title}
          </div>
        )}
        {item.tmdbRating != null && (
          <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-mint">
            TMDB {item.tmdbRating.toFixed(1)}
          </span>
        )}
        {navigating && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="animate-spin text-white" size={20} />
          </span>
        )}
      </button>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <button onClick={openDetail} disabled={navigating} className="text-left">
            <h3 className="line-clamp-2 text-sm font-semibold leading-tight hover:text-lavender">{item.title}</h3>
          </button>
          <p className="text-xs text-text-muted">{item.releaseYear ?? '—'}</p>
          {hasExternalRatings && (
            <div className="mt-1 flex flex-wrap gap-1">
              {item.imdbRating != null && (
                <span className="inline-flex items-center gap-1 rounded-md bg-[#F5C518] px-1.5 py-0.5 text-[10px] font-bold text-black">
                  IMDb {item.imdbRating.toFixed(1)}
                  {item.imdbVotes != null && (
                    <span className="font-normal opacity-70">({formatVotes(item.imdbVotes)})</span>
                  )}
                </span>
              )}
              {item.kpRating != null && (
                <span className="inline-flex items-center gap-1 rounded-md bg-[#FF6600] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  КП {item.kpRating.toFixed(1)}
                  {item.kpVotes != null && (
                    <span className="font-normal opacity-80">({formatVotes(item.kpVotes)})</span>
                  )}
                </span>
              )}
            </div>
          )}
        </div>

        {!added ? (
          <button
            onClick={openPanel}
            disabled={loadingPanel}
            className="mt-auto flex items-center justify-center gap-1.5 rounded-full bg-mint py-1.5 text-xs font-semibold text-black hover:bg-mint-hover disabled:opacity-60"
          >
            {loadingPanel ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
            Добавить
          </button>
        ) : (
          <div className="mt-auto flex gap-1.5">
            <button
              onClick={panelOpen ? () => setPanelOpen(false) : openPanel}
              disabled={loadingPanel}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-surface-hover py-1.5 text-xs font-semibold text-mint disabled:opacity-60"
            >
              {loadingPanel ? <Loader2 className="animate-spin" size={14} /> : <ListPlus size={14} />}
              Списки
            </button>
            <button
              onClick={removeFromLibrary}
              disabled={removing}
              className="flex items-center justify-center rounded-full bg-surface-hover px-2.5 text-red-400 disabled:opacity-60"
              aria-label="Удалить из библиотеки"
            >
              {removing ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
            </button>
          </div>
        )}

        {panelOpen && lists && (
          <div className="rounded-lg bg-background p-2">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] text-text-muted">В список:</span>
              <button onClick={() => setPanelOpen(false)} aria-label="Закрыть">
                <X size={14} className="text-text-muted" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {lists.map((list) => (
                <label key={list.id} className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={listIds.includes(list.id)}
                    onChange={(e) => toggleList(list.id, e.target.checked)}
                  />
                  {list.name}
                </label>
              ))}
              {lists.length === 0 && <p className="text-[11px] text-text-muted">Списков пока нет</p>}
            </div>
            <div className="mt-1.5 flex gap-1">
              <input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createList()}
                placeholder="Новый список..."
                className="w-full min-w-0 flex-1 rounded border border-white/10 bg-surface px-2 py-1 text-[11px] focus:border-lavender focus:outline-none"
              />
              <button
                onClick={createList}
                disabled={!newListName.trim()}
                className="rounded bg-lavender px-2 text-black disabled:opacity-50"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
