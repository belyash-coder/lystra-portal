import { FeedGrid } from '@/components/FeedGrid';

export default function AnimationPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-lavender">Мультфильмы</h1>
      <FeedGrid feed="animation" />
    </div>
  );
}
