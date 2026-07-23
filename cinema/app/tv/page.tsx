import { FeedGrid } from '@/components/FeedGrid';

export default function TvPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-lavender">Сериалы</h1>
      <FeedGrid feed="popular" mediaType="tv" />
    </div>
  );
}
