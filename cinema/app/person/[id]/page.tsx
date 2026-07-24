'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { TmdbResultCard } from '@/components/TmdbResultCard';
import type { TmdbListItem } from '@/lib/types';

interface Person {
  id: number;
  name: string;
  photoUrl: string | null;
  biography: string | null;
  birthday: string | null;
  placeOfBirth: string | null;
  knownForDepartment: string | null;
}

interface Roles {
  director: TmdbListItem[];
  writer: TmdbListItem[];
  producer: TmdbListItem[];
  actor: TmdbListItem[];
}

const ROLE_LABELS: { key: keyof Roles; label: string }[] = [
  { key: 'director', label: 'Режиссёр' },
  { key: 'writer', label: 'Сценарист' },
  { key: 'producer', label: 'Продюсер' },
  { key: 'actor', label: 'Актёр' },
];

export default function PersonPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [person, setPerson] = useState<Person | null>(null);
  const [roles, setRoles] = useState<Roles | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset state when navigating between people
    setLoading(true);
    setNotFound(false);
    fetch(`/api/tmdb/person/${params.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) {
          setNotFound(true);
          return;
        }
        setPerson(data.person);
        setRoles(data.roles);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-text-muted">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (notFound || !person || !roles) {
    return <p className="py-16 text-center text-text-muted">Не удалось загрузить данные.</p>;
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-main"
      >
        <ArrowLeft size={16} />
        Назад
      </button>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="w-full max-w-[180px] shrink-0 overflow-hidden rounded-xl bg-neutral-900">
          {person.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={person.photoUrl} alt={person.name} className="w-full object-cover" />
          ) : (
            <div className="flex aspect-[2/3] items-center justify-center text-center text-sm text-text-muted">
              {person.name}
            </div>
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-xl font-bold">{person.name}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {[person.knownForDepartment, person.placeOfBirth].filter(Boolean).join(' · ')}
          </p>
          {person.birthday && <p className="mt-1 text-sm text-text-muted">Дата рождения: {person.birthday}</p>}
          {person.biography && <p className="mt-3 line-clamp-6 text-sm text-text-muted">{person.biography}</p>}
        </div>
      </div>

      {ROLE_LABELS.map(({ key, label }) => {
        const items = roles[key];
        if (items.length === 0) return null;
        return (
          <div key={key} className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-text-muted">
              {label} ({items.length})
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {items.map((item) => (
                <TmdbResultCard key={`${key}-${item.mediaType}-${item.tmdbId}`} item={item} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
