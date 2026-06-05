import { NextResponse } from 'next/server';
import { createProposal } from '@/lib/services/proposalService';
import { validateRequired, isValidEthereumAddress } from '@/lib/validations';
import { prisma } from '@/lib/prisma';
import { verifyEip712Signature, PROPOSAL_MESSAGE_TYPES, unauthorizedResponse } from '@/lib/eip712';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get('roundId');
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);
    const skip = Number(searchParams.get('skip')) || 0;

    const proposals = await prisma.proposal.findMany({
      where: {
        deletedAt: null,
        ...(roundId ? { roundId: Number(roundId) } : {}),
      },
      include: {
        votes: true,
        round: { include: { house: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });

    return NextResponse.json(proposals);
  } catch (error) {
    console.error('GET /api/proposals error:', error);
    return NextResponse.json({ error: 'Failed to fetch proposals' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const hasSignature = body.signedData?.signature;

    if (hasSignature) {
      const { valid, signer, error } = await verifyEip712Signature(body, PROPOSAL_MESSAGE_TYPES);
      if (!valid) return NextResponse.json({ error: error ?? 'Signature verification failed' }, { status: 401 });
      if (signer !== body.address?.toLowerCase()) {
        return NextResponse.json({ error: 'Signer does not match address' }, { status: 401 });
      }
    }

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
