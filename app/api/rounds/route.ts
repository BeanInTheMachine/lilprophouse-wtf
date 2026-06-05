import { NextResponse } from 'next/server';
import { getRoundsForHouse, getActiveRounds } from '@/lib/services/roundService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const houseId = searchParams.get('houseId');
    const state = searchParams.get('state');

    if (houseId) {
      const rounds = await getRoundsForHouse(Number(houseId));
      return NextResponse.json(rounds);
    }

    if (state === 'active') {
      const rounds = await getActiveRounds();
      return NextResponse.json(rounds);
    }

    const rounds = await getActiveRounds();
    return NextResponse.json(rounds);
  } catch (error) {
    console.error('GET /api/rounds error:', error);
    return NextResponse.json({ error: 'Failed to fetch rounds' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prisma } = await import('@/lib/prisma');

    const round = await prisma.round.create({
      data: {
        type: body.type ?? 'TIMED',
        title: body.title,
        description: body.description ?? null,
        fundingAmount: body.fundingAmount ?? 0,
        currencyType: body.currencyType ?? null,
        numWinners: body.numWinners ?? 1,
        startTime: new Date(body.startTime),
        proposalEndTime: body.proposalEndTime ? new Date(body.proposalEndTime) : null,
        votingEndTime: body.votingEndTime ? new Date(body.votingEndTime) : null,
        houseId: body.houseId ?? 1,
        propStrategy: body.propStrategy ?? { type: 'all' },
        voteStrategy: body.voteStrategy ?? { type: 'all' },
        quorumFor: body.quorumFor ?? null,
        quorumAgainst: body.quorumAgainst ?? null,
        votingPeriod: body.votingPeriod ?? null,
        propStrategyDescription: body.propStrategyDescription ?? null,
        voteStrategyDescription: body.voteStrategyDescription ?? null,
      },
    });

    return NextResponse.json(round, { status: 201 });
  } catch (error) {
    console.error('POST /api/rounds error:', error);
    return NextResponse.json({ error: 'Failed to create round' }, { status: 500 });
  }
}
