import { prisma } from '@/lib/prisma';

export async function getHouses() {
  return prisma.house.findMany({
    where: { visible: true },
    include: {
      rounds: {
        where: { visible: true },
        include: {
          proposals: {
            where: { deletedAt: null },
            include: { votes: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getHouseById(id: number) {
  return prisma.house.findFirst({
    where: { id, visible: true },
    include: {
      rounds: {
        where: { visible: true },
        include: {
          proposals: {
            where: { deletedAt: null },
            include: { votes: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

export async function getHouseByContractAddress(address: string) {
  return prisma.house.findFirst({
    where: { contractAddress: address.toLowerCase(), visible: true },
    include: {
      rounds: {
        where: { visible: true },
        include: {
          proposals: {
            where: { deletedAt: null },
            include: { votes: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}
