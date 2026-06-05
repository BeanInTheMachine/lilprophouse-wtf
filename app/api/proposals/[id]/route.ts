import { NextResponse } from 'next/server';
import { getProposalById } from '@/lib/services/proposalService';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const proposalId = parseInt(params.id, 10);

    if (isNaN(proposalId)) {
      return NextResponse.json({ error: 'Invalid proposal ID' }, { status: 400 });
    }

    const proposal = await getProposalById(proposalId);

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    return NextResponse.json(proposal);
  } catch (error) {
    console.error('GET /api/proposals/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch proposal' }, { status: 500 });
  }
}
