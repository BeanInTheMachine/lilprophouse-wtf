import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { getAllRounds } from '@/lib/services/roundService';

export async function GET() {
  try {
    const rounds = await getAllRounds();
    return NextResponse.json(rounds);
  } catch (error) {
    console.error('GET /api/admin/rounds error:', error);
    return NextResponse.json({ error: 'Failed to fetch rounds' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { roundId, address } = body;

    if (!roundId || !address) {
      return NextResponse.json({ error: 'Missing roundId or address' }, { status: 400 });
    }

    if (!isAdmin(address)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { prisma } = await import('@/lib/prisma');

    await prisma.round.update({
      where: { id: roundId },
      data: { visible: false, state: 'CANCELLED' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/admin/rounds error:', error);
    return NextResponse.json({ error: 'Failed to remove round' }, { status: 500 });
  }
}
