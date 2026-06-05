import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: { address: string } },
) {
  try {
    const round = await prisma.round.findFirst({
      where: { visible: true },
      include: {
        proposals: {
          where: { deletedAt: null },
          include: { votes: true },
        },
        house: true,
      },
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    return NextResponse.json(round);
  } catch (error) {
    console.error('GET /api/rounds/address/[address] error:', error);
    return NextResponse.json({ error: 'Failed to fetch round' }, { status: 500 });
  }
}
