import { NextResponse } from 'next/server';
import { createVote, createVotes } from '@/lib/services/voteService';
import { validateRequired, isValidEthereumAddress } from '@/lib/validations';
import type { Direction } from '@prisma/client';

const VALID_DIRECTIONS: Direction[] = ['FOR', 'AGAINST', 'ABSTAIN'];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { votes } = body;

    if (!votes || !Array.isArray(votes)) {
      return NextResponse.json({ error: 'Request body must include a "votes" array' }, { status: 400 });
    }

    if (votes.length === 0) {
      return NextResponse.json({ error: 'At least one vote is required' }, { status: 400 });
    }

    for (let i = 0; i < votes.length; i++) {
      const vote = votes[i];
      const index = `votes[${i}]`;

      const missing = validateRequired(vote, [
        'direction',
        'weight',
        'address',
        'proposalId',
        'roundId',
        'communityAddress',
        'signature',
        'signedMessage',
      ]);

      if (missing) {
        return NextResponse.json({ error: `${index}: ${missing}` }, { status: 400 });
      }

      if (!isValidEthereumAddress(vote.address)) {
        return NextResponse.json({ error: `${index}: Invalid address` }, { status: 400 });
      }

      if (!isValidEthereumAddress(vote.communityAddress)) {
        return NextResponse.json({ error: `${index}: Invalid community address` }, { status: 400 });
      }

      if (!VALID_DIRECTIONS.includes(vote.direction)) {
        return NextResponse.json(
          { error: `${index}: Direction must be one of ${VALID_DIRECTIONS.join(', ')}` },
          { status: 400 },
        );
      }

      if (typeof vote.weight !== 'number' || vote.weight <= 0) {
        return NextResponse.json({ error: `${index}: Weight must be a positive number` }, { status: 400 });
      }

      if (typeof vote.proposalId !== 'number') {
        return NextResponse.json({ error: `${index}: proposalId must be a number` }, { status: 400 });
      }

      if (typeof vote.roundId !== 'number') {
        return NextResponse.json({ error: `${index}: roundId must be a number` }, { status: 400 });
      }
    }

    const result =
      votes.length === 1
        ? await createVote({
            direction: votes[0].direction,
            weight: votes[0].weight,
            address: votes[0].address,
            proposalId: votes[0].proposalId,
            roundId: votes[0].roundId,
            blockHeight: votes[0].blockHeight,
            communityAddress: votes[0].communityAddress,
            signature: votes[0].signature,
            signedMessage: votes[0].signedMessage,
          })
        : await createVotes(
            votes.map((v: any) => ({
              direction: v.direction,
              weight: v.weight,
              address: v.address,
              proposalId: v.proposalId,
              roundId: v.roundId,
              blockHeight: v.blockHeight,
              communityAddress: v.communityAddress,
              signature: v.signature,
              signedMessage: v.signedMessage,
            })),
          );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST /api/votes error:', error);
    return NextResponse.json({ error: 'Failed to cast votes' }, { status: 500 });
  }
}
