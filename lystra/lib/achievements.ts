import {
  PenLine,
  MessageSquare,
  Crown,
  Music,
  Sparkles,
  Rocket,
  BookmarkCheck,
  Clock,
  Compass,
  History,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';

export interface AchievementMeta {
  title: string;
  description: string;
  icon: LucideIcon;
}

// Ключ — то же значение, что пишется в achievements.achievement_name
export const ACHIEVEMENTS: Record<string, AchievementMeta> = {
  first_review: {
    title: 'Первая рецензия',
    description: 'Написал(а) первую рецензию на портале',
    icon: PenLine,
  },
  reviews_10: {
    title: 'Штатный критик',
    description: 'Написал(а) 10 рецензий',
    icon: MessageSquare,
  },
  reviews_50: {
    title: 'Матёрый критик',
    description: 'Написал(а) 50 рецензий',
    icon: Crown,
  },
  first_release: {
    title: 'Первый релиз',
    description: 'Добавил(а) первый релиз независимой сцены',
    icon: Music,
  },
  releases_5: {
    title: 'Куратор сцены',
    description: 'Добавил(а) 5 релизов независимой сцены',
    icon: Sparkles,
  },
  releases_20: {
    title: 'Амбассадор сцены',
    description: 'Добавил(а) 20 релизов независимой сцены',
    icon: Rocket,
  },
  collector_10: {
    title: 'Коллекционер',
    description: 'Добавил(а) 10 релизов в коллекцию',
    icon: BookmarkCheck,
  },
  wishlist_10: {
    title: 'Список желаний',
    description: 'Добавил(а) 10 релизов в «Хочу послушать»',
    icon: Clock,
  },
  versatile: {
    title: 'Разносторонний',
    description: 'Написал(а) рецензию, добавил(а) релиз и пополнил(а) коллекцию',
    icon: Compass,
  },
  veteran: {
    title: 'Старожил',
    description: 'На портале от 30 дней и уже проявил(а) активность',
    icon: History,
  },
  mobile_connected: {
    title: 'Единый профиль',
    description: 'Подключил(а) аккаунт к мобильному приложению LYSTRA',
    icon: Smartphone,
  },
};

export function getAchievementMeta(name: string): AchievementMeta {
  return (
    ACHIEVEMENTS[name] ?? {
      title: name,
      description: 'Достижение разблокировано',
      icon: Sparkles,
    }
  );
}
