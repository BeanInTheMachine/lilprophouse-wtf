import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [houses, rounds, proposals, votes, fundingResult] = await Promise.all([
      prisma.house.count({ where: { visible: true } }),
      prisma.round.count({ where: { visible: true } }),
      prisma.proposal.count({ where: { deletedAt: null } }),
      prisma.vote.count(),
      prisma.round.aggregate({
        _sum: { fundingAmount: true },
        where: { visible: true, state: 'COMPLETED' },
      }),
    ]);

    const usdAwarded = Number(fundingResult._sum.fundingAmount ?? 0);

    return NextResponse.json({ houses, rounds, proposals, votes, usdAwarded });
  } catch (error) {
    console.error('GET /api/stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
