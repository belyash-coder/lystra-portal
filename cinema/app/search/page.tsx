import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { SearchResults } from '@/components/SearchResults';

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16 text-text-muted">
          <Loader2 className="animate-spin" size={24} />
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
