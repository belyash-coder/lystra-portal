import { prisma } from './prisma';

export async function isSharedListMember(sharedListId: string, profileId: string): Promise<boolean> {
  const membership = await prisma.sharedListMember.findUnique({
    where: { sharedListId_profileId: { sharedListId, profileId } },
  });
  return membership != null;
}
