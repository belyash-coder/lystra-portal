import { FeedGrid } from '@/components/FeedGrid';

export default function OverviewPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-lavender">Обзор</h1>
      <FeedGrid feed="trending" showFilters={false} />
    </div>
  );
}
