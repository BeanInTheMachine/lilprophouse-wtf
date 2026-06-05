import { NextResponse } from 'next/server';
import { getReplies, insertReply } from '@/lib/supabase';
import { verifyEip712Signature } from '@/lib/eip712';
import { REPLY_MESSAGE_TYPES } from '@/lib/replyTypes';
import { validateRequired, isValidEthereumAddress } from '@/lib/validations';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const proposalId = searchParams.get('proposalId');

    if (!proposalId) {
      return NextResponse.json({ error: 'proposalId query param is required' }, { status: 400 });
    }

    const replies = await getReplies(Number(proposalId));
    return NextResponse.json(replies);
  } catch (error) {
    console.error('GET /api/replies error:', error);
    return NextResponse.json({ error: 'Failed to fetch replies' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const hasSignature = body.signedData?.signature;

    if (hasSignature) {
      const { valid, signer, error: sigError } = await verifyEip712Signature(body, REPLY_MESSAGE_TYPES);
      if (!valid) {
        return NextResponse.json({ error: sigError ?? 'Signature verification failed' }, { status: 401 });
      }
      if (signer !== body.address?.toLowerCase()) {
        return NextResponse.json({ error: 'Signer does not match address' }, { status: 401 });
      }
    }

    const missing = validateRequired(body, ['content', 'address', 'proposalId', 'communityAddress', 'blockTag']);
    if (missing) {
      return NextResponse.json({ error: missing }, { status: 400 });
    }

    if (!isValidEthereumAddress(body.address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    if (!isValidEthereumAddress(body.communityAddress)) {
      return NextResponse.json({ error: 'Invalid community address' }, { status: 400 });
    }

    if (!body.content.trim()) {
      return NextResponse.json({ error: 'Reply content is required' }, { status: 400 });
    }

    const reply = await insertReply({
      proposalId: body.proposalId,
      content: body.content.trim(),
      address: body.address,
      communityAddress: body.communityAddress,
      blockTag: body.blockTag ?? 0,
      signature: body.signedData?.signature ?? '',
      signedMessage: body.signedData?.message ?? '',
    });

    return NextResponse.json(reply, { status: 201 });
  } catch (error) {
    console.error('POST /api/replies error:', error);
    return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
  }
}
