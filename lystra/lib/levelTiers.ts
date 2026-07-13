// Пороги и визуальные рамки для системы уровней портала.
// У нового пользователя (0 XP) рамки нет вообще — только у активных.
export interface LevelTier {
  level: number;
  minXp: number;
  title: string;
}

export const LEVEL_TIERS: LevelTier[] = [
  { level: 1, minXp: 0, title: 'Новичок' },
  { level: 2, minXp: 28, title: 'Меломан' },
  { level: 3, minXp: 100, title: 'Критик' },
  { level: 4, minXp: 300, title: 'Легенда сцены' },
];

export function getTierIndex(xp: number): number {
  let idx = 0;
  for (let i = 0; i < LEVEL_TIERS.length; i++) {
    if (xp >= LEVEL_TIERS[i].minXp) idx = i;
  }
  return idx;
}

export function getTier(xp: number): LevelTier {
  return LEVEL_TIERS[getTierIndex(xp)];
}

export function hasGlow(xp: number): boolean {
  return getTierIndex(xp) === LEVEL_TIERS.length - 1;
}

// compact — маленький аватар (шапка/мобильное меню), large — крупный (страница профиля)
export function getFrameClass(xp: number, variant: 'compact' | 'large' = 'compact'): string {
  const tierIdx = getTierIndex(xp);

  if (variant === 'large') {
    switch (tierIdx) {
      case 3:
        return 'p-1.5 bg-gradient-to-tr from-[#a78bfa] via-[#34d399] to-[#a78bfa] shadow-[0_0_0_4px_#121212,0_0_0_6px_#a78bfa]';
      case 2:
        return 'border-4 border-[#34d399] shadow-[0_0_15px_rgba(52,211,153,0.3)]';
      case 1:
        return 'border-2 border-[#a78bfa] ring-4 ring-[#121212] ring-offset-1 ring-offset-[#a78bfa]';
      default:
        return 'border-2 border-transparent';
    }
  }

  switch (tierIdx) {
    case 3:
      return 'p-0.5 bg-gradient-to-tr from-[#a78bfa] via-[#34d399] to-[#a78bfa] shadow-[0_0_0_2px_#121212,0_0_0_4px_#a78bfa]';
    case 2:
      return 'border-[2px] border-[#34d399] shadow-[0_0_8px_rgba(52,211,153,0.3)] group-hover:shadow-[0_0_12px_rgba(52,211,153,0.5)]';
    case 1:
      return 'border-2 border-[#a78bfa] ring-1 ring-[#121212] ring-offset-1 ring-offset-[#a78bfa]';
    default:
      return 'border-2 border-transparent group-hover:border-[#a78bfa]/50';
  }
}

export function getGlowClass(variant: 'compact' | 'large' = 'compact'): string {
  return variant === 'large'
    ? 'absolute -inset-3 bg-gradient-to-tr from-[#a78bfa] to-[#34d399] rounded-full blur-xl opacity-50 animate-pulse -z-10'
    : 'absolute -inset-1 bg-gradient-to-tr from-[#a78bfa] to-[#34d399] rounded-full blur-sm opacity-50 animate-pulse -z-10';
}
