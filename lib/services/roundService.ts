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
    where: { houseId, visible: true, state: { not: 'CANCELLED' } },
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
  const now = new Date();
  return prisma.round.findMany({
    where: {
      visible: true,
      state: { notIn: ['COMPLETED', 'CANCELLED', 'NOT_STARTED'] },
      OR: [{ votingEndTime: null }, { votingEndTime: { gt: now } }],
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

export async function getCompletedRounds() {
  const now = new Date();
  return prisma.round.findMany({
    where: {
      visible: true,
      state: { notIn: ['CANCELLED', 'NOT_STARTED'] },
      OR: [{ state: 'COMPLETED' }, { votingEndTime: { lte: now } }],
    },
    include: {
      proposals: {
        where: { deletedAt: null },
        include: { votes: true },
      },
      house: true,
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getAllRounds() {
  return prisma.round.findMany({
    include: {
      proposals: {
        where: { deletedAt: null },
      },
      house: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}
