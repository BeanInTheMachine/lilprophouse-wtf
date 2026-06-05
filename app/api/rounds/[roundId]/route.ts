import { NextResponse } from 'next/server';
import { getRoundById } from '@/lib/services/roundService';

export async function GET(
  _request: Request,
  { params }: { params: { roundId: string } },
) {
  try {
    const id = parseInt(params.roundId, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid round ID' }, { status: 400 });
    }

    const round = await getRoundById(id);

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    return NextResponse.json(round);
  } catch (error) {
    console.error('GET /api/rounds/[roundId] error:', error);
    return NextResponse.json({ error: 'Failed to fetch round' }, { status: 500 });
  }
}
