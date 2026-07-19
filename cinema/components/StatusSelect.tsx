'use client';

import { STATUS_LABELS, type WatchStatus } from '@/lib/types';

const OPTIONS: WatchStatus[] = ['PLANNED', 'WATCHING', 'WATCHED'];

export function StatusSelect({
  value,
  onChange,
}: {
  value: WatchStatus;
  onChange: (status: WatchStatus) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as WatchStatus)}
      className="w-full rounded-lg border border-white/10 bg-surface px-2 py-1.5 text-xs text-text-main focus:border-lavender focus:outline-none"
    >
      {OPTIONS.map((status) => (
        <option key={status} value={status}>
          {STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}
