import { prisma } from '@/lib/prisma';
import { getTier } from '@/lib/levelTiers';

export async function awardXp(userId: string, amount: number) {
  const updated = await prisma.profiles.update({
    where: { id: userId },
    data: { xp: { increment: amount } },
    select: { xp: true },
  });

  const xp = updated.xp ?? 0;
  const tier = getTier(xp);

  await prisma.profiles.update({
    where: { id: userId },
    data: { level: tier.level, title: tier.title },
  });
}

// Идемпотентно — повторный вызов для уже разблокированного достижения ничего не делает.
export async function unlockAchievement(userId: string, name: string): Promise<boolean> {
  try {
    await prisma.achievements.create({
      data: { user_id: userId, achievement_name: name },
    });
    return true;
  } catch (error: any) {
    if (error?.code === 'P2002') return false;
    throw error;
  }
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Пересчитывает все достижения портала по фактической активности пользователя.
// Безопасно вызывать многократно — уже открытые медали не трогает.
export async function syncPortalAchievements(userId: string) {
  const [reviewsCount, releasesCount, collectionCount, wishlistCount, profile] = await Promise.all([
    prisma.reviews.count({ where: { user_id: userId } }),
    prisma.releases.count({ where: { user_id: userId } }),
    prisma.collections.count({ where: { user_id: userId, list_type: 'collection' } }),
    prisma.collections.count({ where: { user_id: userId, list_type: 'listen_later' } }),
    prisma.profiles.findUnique({ where: { id: userId }, select: { created_at: true } }),
  ]);

  const toUnlock: string[] = [];

  if (reviewsCount >= 1) toUnlock.push('first_review');
  if (reviewsCount >= 10) toUnlock.push('reviews_10');
  if (reviewsCount >= 50) toUnlock.push('reviews_50');

  if (releasesCount >= 1) toUnlock.push('first_release');
  if (releasesCount >= 5) toUnlock.push('releases_5');
  if (releasesCount >= 20) toUnlock.push('releases_20');

  if (collectionCount >= 10) toUnlock.push('collector_10');
  if (wishlistCount >= 10) toUnlock.push('wishlist_10');

  if (reviewsCount >= 1 && releasesCount >= 1 && collectionCount >= 1) {
    toUnlock.push('versatile');
  }

  if (profile?.created_at) {
    const ageMs = Date.now() - profile.created_at.getTime();
    if (ageMs >= THIRTY_DAYS_MS && (reviewsCount >= 1 || releasesCount >= 1)) {
      toUnlock.push('veteran');
    }
  }

  await Promise.all(toUnlock.map((name) => unlockAchievement(userId, name)));
}
