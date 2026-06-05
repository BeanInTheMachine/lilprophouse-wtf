import { NextResponse } from 'next/server';
import { getProposalById, deleteProposal } from '@/lib/services/proposalService';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idStr } = await params;
    const proposalId = parseInt(idStr, 10);
    if (isNaN(proposalId)) return NextResponse.json({ error: 'Invalid proposal ID' }, { status: 400 });

    const proposal = await getProposalById(proposalId);
    if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });

    return NextResponse.json(proposal);
  } catch (error) {
    console.error('GET /api/proposals/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch proposal' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid proposal ID' }, { status: 400 });

    const body = await request.json();

    const proposal = await prisma.proposal.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.tldr !== undefined && { tldr: body.tldr }),
        ...(body.reqAmount !== undefined && { reqAmount: body.reqAmount ?? null }),
      },
      include: { round: { include: { house: true } }, votes: true },
    });

    return NextResponse.json(proposal);
  } catch (error) {
    console.error('PATCH /api/proposals/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update proposal' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid proposal ID' }, { status: 400 });

    const body = await request.json();
    const address = body.address;
    if (!address) return NextResponse.json({ error: 'Address required for deletion' }, { status: 400 });

    const result = await deleteProposal(id, address);
    if (!result) return NextResponse.json({ error: 'Proposal not found or not authorized' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/proposals/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete proposal' }, { status: 500 });
  }
}
