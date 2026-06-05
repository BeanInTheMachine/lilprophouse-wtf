import { prisma } from '@/lib/prisma';

export async function getRoundById(id: number) {
  return prisma.round.findFirst({
    where: { id, visible: true },
    include: {
      proposals: {
        where: { deletedAt: null },
        include: { votes: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

export async function getRoundsForHouse(houseId: number) {
  return prisma.round.findMany({
    where: { houseId, visible: true },
    include: {
      proposals: {
        where: { deletedAt: null },
        include: { votes: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getActiveRounds() {
  return prisma.round.findMany({
    where: {
      visible: true,
      state: 'ACCEPTING_PROPOSALS',
    },
    include: {
      proposals: {
        where: { deletedAt: null },
        include: { votes: true },
      },
      house: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}
