'use client';

import { useMemo, useState } from 'react';
import genresDataRaw from '@/data/genres.json';

const ALL_TAGS = genresDataRaw as string[];
const MAX_TAGS = 8;
const MAX_SUGGESTIONS = 8;

interface TagPickerProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

export default function TagPicker({ selectedTags, onChange }: TagPickerProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ALL_TAGS
      .filter((tag) => tag.includes(q) && !selectedTags.includes(tag))
      .slice(0, MAX_SUGGESTIONS);
  }, [query, selectedTags]);

  const addTag = (tag: string) => {
    if (selectedTags.length >= MAX_TAGS || selectedTags.includes(tag)) return;
    onChange([...selectedTags, tag]);
    setQuery('');
    setIsOpen(false);
  };

  const removeTag = (tag: string) => {
    onChange(selectedTags.filter((t) => t !== tag));
  };

  const limitReached = selectedTags.length >= MAX_TAGS;

  return (
    <div>
      <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-2">
        Теги (необязательно, до {MAX_TAGS})
      </label>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 bg-[#a78bfa]/10 border border-[#a78bfa]/30 text-[#a78bfa] text-xs font-medium px-2.5 py-1 rounded-full"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`Удалить тег "${tag}"`}
                className="hover:text-white transition-colors"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          disabled={limitReached}
          placeholder={limitReached ? `Достигнут лимит в ${MAX_TAGS} тегов` : 'Начните вводить тег, например "synthwave"'}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#a78bfa] transition-colors text-sm disabled:opacity-50"
        />

        {isOpen && suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl shadow-lg overflow-hidden">
            {suggestions.map((tag) => (
              <button
                type="button"
                key={tag}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addTag(tag)}
                className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
