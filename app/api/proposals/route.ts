import { NextResponse } from 'next/server';
import { createProposal } from '@/lib/services/proposalService';
import { validateRequired, isValidEthereumAddress } from '@/lib/validations';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const missing = validateRequired(body, ['title', 'content', 'tldr', 'address', 'roundId']);
    if (missing) {
      return NextResponse.json({ error: missing }, { status: 400 });
    }

    if (!isValidEthereumAddress(body.address)) {
      return NextResponse.json({ error: 'Invalid Ethereum address' }, { status: 400 });
    }

    if (!body.title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!body.tldr.trim()) {
      return NextResponse.json({ error: 'TLDR is required' }, { status: 400 });
    }

    if (!body.content.trim()) {
      return NextResponse.json({ error: 'Proposal content is required' }, { status: 400 });
    }

    if (body.reqAmount !== undefined && body.reqAmount !== null) {
      const amount = Number(body.reqAmount);
      if (isNaN(amount) || amount < 0) {
        return NextResponse.json({ error: 'Invalid funding request amount' }, { status: 400 });
      }
    }

    const proposal = await createProposal({
      title: body.title.trim(),
      content: body.content.trim(),
      tldr: body.tldr.trim(),
      address: body.address,
      roundId: body.roundId,
      reqAmount: body.reqAmount ?? undefined,
    });

    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    console.error('POST /api/proposals error:', error);
    return NextResponse.json({ error: 'Failed to create proposal' }, { status: 500 });
  }
}
