'use client';

import Link from 'next/link';
import { Users2 } from 'lucide-react';
import { sharedListPartnerLabel, type SharedListSummary } from '@/lib/types';

export function SharedListPicker({
  movieId,
  lists,
  sharedListIds,
  onMembershipChange,
}: {
  movieId: string;
  lists: SharedListSummary[];
  sharedListIds: string[];
  onMembershipChange: (sharedListIds: string[]) => void;
}) {
  async function toggle(sharedListId: string, checked: boolean) {
    onMembershipChange(
      checked ? [...sharedListIds, sharedListId] : sharedListIds.filter((id) => id !== sharedListId)
    );
    if (checked) {
      await fetch(`/api/movies/${movieId}/shared-lists`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharedListId }),
      });
    } else {
      await fetch(`/api/movies/${movieId}/shared-lists?sharedListId=${sharedListId}`, { method: 'DELETE' });
    }
  }

  if (lists.length === 0) {
    return (
      <div className="rounded-xl bg-surface p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-muted">
          <Users2 size={16} />
          Совместные списки
        </h3>
        <p className="text-xs text-text-muted">
          Совместных списков пока нет —{' '}
          <Link href="/shared-lists" className="text-lavender hover:underline">
            создайте
          </Link>{' '}
          в меню профиля.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-muted">
        <Users2 size={16} />
        Совместные списки
      </h3>
      <div className="flex flex-col gap-2">
        {lists.map((list) => (
          <label key={list.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sharedListIds.includes(list.id)}
              onChange={(e) => toggle(list.id, e.target.checked)}
            />
            Смотреть вместе с {sharedListPartnerLabel(list.partner)}
          </label>
        ))}
      </div>
    </div>
  );
}
