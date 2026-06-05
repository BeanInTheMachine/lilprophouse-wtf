import { NextResponse } from 'next/server';
import { getVotesByAddress, getVotesByRound } from '@/lib/services/voteService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const roundId = searchParams.get('roundId');

    if (address) {
      const votes = await getVotesByAddress(address);
      return NextResponse.json(votes);
    }

    if (roundId) {
      const votes = await getVotesByRound(Number(roundId));
      return NextResponse.json(votes);
    }

    return NextResponse.json({ error: 'Provide address or roundId query param' }, { status: 400 });
  } catch (error) {
    console.error('GET /api/votes error:', error);
    return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 });
  }
}
