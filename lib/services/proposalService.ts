import { prisma } from '@/lib/prisma';

interface CreateProposalInput {
  title: string;
  content: string;
  tldr: string;
  address: string;
  roundId: number;
  reqAmount?: number;
  onChainIndex?: number;
}

export async function createProposal(input: CreateProposalInput) {
  return prisma.proposal.create({
    data: {
      title: input.title,
      content: input.content,
      tldr: input.tldr,
      address: input.address.toLowerCase(),
      roundId: input.roundId,
      reqAmount: input.reqAmount ?? null,
      onChainIndex: input.onChainIndex ?? null,
    },
    include: {
      round: {
        include: { house: true },
      },
    },
  });
}

export async function getProposalById(id: number) {
  return prisma.proposal.findFirst({
    where: { id, deletedAt: null },
    include: {
      votes: true,
      round: {
        include: { house: true },
      },
    },
  });
}

export async function getProposalsForRound(roundId: number) {
  return prisma.proposal.findMany({
    where: { roundId, deletedAt: null },
    include: {
      votes: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteProposal(id: number, address: string) {
  const proposal = await prisma.proposal.findFirst({
    where: { id, address: address.toLowerCase(), deletedAt: null },
  });

  if (!proposal) return null;

  return prisma.proposal.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
