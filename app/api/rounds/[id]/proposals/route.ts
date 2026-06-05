import { NextResponse } from 'next/server';
import { getProposalsForRound } from '@/lib/services/proposalService';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const roundId = parseInt(params.id, 10);
    if (isNaN(roundId)) {
      return NextResponse.json({ error: 'Invalid round ID' }, { status: 400 });
    }
    const proposals = await getProposalsForRound(roundId);
    return NextResponse.json(proposals);
  } catch (error) {
    console.error('GET /api/rounds/[id]/proposals error:', error);
    return NextResponse.json({ error: 'Failed to fetch proposals' }, { status: 500 });
  }
}
