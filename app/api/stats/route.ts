import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [houses, rounds, proposals, votes] = await Promise.all([
      prisma.house.count({ where: { visible: true } }),
      prisma.round.count({ where: { visible: true } }),
      prisma.proposal.count({ where: { deletedAt: null } }),
      prisma.vote.count(),
    ]);

    return NextResponse.json({ houses, rounds, proposals, votes });
  } catch (error) {
    console.error('GET /api/stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
