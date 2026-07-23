import { FeedGrid } from '@/components/FeedGrid';

export default function MoviesPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-lavender">Фильмы</h1>
      <FeedGrid feed="popular" mediaType="movie" />
    </div>
  );
}
