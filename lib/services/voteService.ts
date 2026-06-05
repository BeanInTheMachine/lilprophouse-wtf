import { prisma } from '@/lib/prisma';
import type { Direction } from '@prisma/client';

interface CastVoteInput {
  direction: Direction;
  weight: number;
  address: string;
  proposalId: number;
  roundId: number;
  blockHeight?: number;
  communityAddress: string;
  signature: string;
  signedMessage: string;
}

export async function createVote(input: CastVoteInput) {
  return prisma.vote.create({
    data: {
      direction: input.direction,
      weight: input.weight,
      address: input.address.toLowerCase(),
      proposalId: input.proposalId,
      roundId: input.roundId,
      blockHeight: input.blockHeight ?? 0,
      communityAddress: input.communityAddress.toLowerCase(),
      signature: input.signature,
      signedMessage: input.signedMessage,
    },
  });
}

export async function createVotes(inputs: CastVoteInput[]) {
  return prisma.$transaction(
    inputs.map((input) =>
      prisma.vote.create({
        data: {
          direction: input.direction,
          weight: input.weight,
          address: input.address.toLowerCase(),
          proposalId: input.proposalId,
          roundId: input.roundId,
          blockHeight: input.blockHeight ?? 0,
          communityAddress: input.communityAddress.toLowerCase(),
          signature: input.signature,
          signedMessage: input.signedMessage,
        },
      }),
    ),
  );
}

export async function getVotesByAddress(address: string) {
  return prisma.vote.findMany({
    where: { address: address.toLowerCase() },
    include: {
      proposal: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getVotesByRound(roundId: number) {
  return prisma.vote.findMany({
    where: { roundId },
    include: {
      proposal: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}
