'use client';

import { Plus, Check, Loader2 } from 'lucide-react';
import type { TmdbListItem } from '@/lib/types';

export function TmdbResultCard({
  item,
  added,
  adding,
  onAdd,
}: {
  item: TmdbListItem;
  added: boolean;
  adding: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-surface shadow-lg">
      <div className="relative aspect-[2/3] w-full bg-neutral-900">
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
            {item.tmdbRating.toFixed(1)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight">{item.title}</h3>
          <p className="text-xs text-text-muted">{item.releaseYear ?? '—'}</p>
        </div>
        <button
          onClick={onAdd}
          disabled={adding || added}
          className="mt-auto flex items-center justify-center gap-1.5 rounded-full bg-mint py-1.5 text-xs font-semibold text-black hover:bg-mint-hover disabled:opacity-60"
        >
          {adding ? (
            <Loader2 className="animate-spin" size={14} />
          ) : added ? (
            <Check size={14} />
          ) : (
            <Plus size={14} />
          )}
          {added ? 'В библиотеке' : 'Добавить'}
        </button>
      </div>
    </div>
  );
}
