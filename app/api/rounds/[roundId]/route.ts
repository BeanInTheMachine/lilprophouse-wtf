import { NextResponse } from 'next/server';
import { getRoundById } from '@/lib/services/roundService';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roundId: string }> },
) {
  try {
    const { roundId: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid round ID' }, { status: 400 });

    const round = await getRoundById(id);
    if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 });

    return NextResponse.json(round);
  } catch (error) {
    console.error('GET /api/rounds/[roundId] error:', error);
    return NextResponse.json({ error: 'Failed to fetch round' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roundId: string }> },
) {
  try {
    const { roundId: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid round ID' }, { status: 400 });

    const body = await request.json();

    const round = await prisma.round.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.state !== undefined && { state: body.state }),
        ...(body.visible !== undefined && { visible: body.visible }),
        ...(body.fundingAmount !== undefined && { fundingAmount: body.fundingAmount }),
        ...(body.numWinners !== undefined && { numWinners: body.numWinners }),
        ...(body.proposalEndTime !== undefined && { proposalEndTime: new Date(body.proposalEndTime) }),
        ...(body.votingEndTime !== undefined && { votingEndTime: new Date(body.votingEndTime) }),
      },
    });

    return NextResponse.json(round);
  } catch (error) {
    console.error('PATCH /api/rounds/[roundId] error:', error);
    return NextResponse.json({ error: 'Failed to update round' }, { status: 500 });
  }
}
