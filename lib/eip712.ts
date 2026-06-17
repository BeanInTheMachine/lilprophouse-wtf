import { verifyTypedData, hashTypedData } from 'viem';
import { NextResponse } from 'next/server';

export const DOMAIN_SEPARATOR = {
  name: 'Prop House',
  version: '1',
  chainId: 8453,
} as const;

export const PROPOSAL_MESSAGE_TYPES = {
  Proposal: [
    { name: 'title', type: 'string' },
    { name: 'what', type: 'string' },
    { name: 'tldr', type: 'string' },
    { name: 'parentAuctionId', type: 'uint256' },
    { name: 'parentType', type: 'string' },
  ],
};



export const EDIT_PROPOSAL_MESSAGE_TYPES = {
  Proposal: [
    { name: 'id', type: 'uint256' },
    { name: 'title', type: 'string' },
    { name: 'what', type: 'string' },
    { name: 'tldr', type: 'string' },
    { name: 'parentAuctionId', type: 'uint256' },
    { name: 'parentType', type: 'string' },
    { name: 'reqAmount', type: 'uint256' },
  ],
};

export const DELETE_PROPOSAL_MESSAGE_TYPES = {
  Proposal: [{ name: 'id', type: 'uint256' }],
};

export const VOTE_MESSAGE_TYPES = {
  Vote: [
    { name: 'direction', type: 'uint256' },
    { name: 'proposalId', type: 'uint256' },
    { name: 'weight', type: 'uint256' },
    { name: 'communityAddress', type: 'string' },
    { name: 'blockHeight', type: 'uint256' },
  ],
};

interface SignedData {
  message: string;
  signature: string;
  signer: string;
}

interface SignedBody {
  signedData: SignedData;
  messageTypes: string;
  domainSeparator: string;
  [key: string]: any;
}

export async function verifyEip712Signature(
  body: any,
  messageTypes: Record<string, { name: string; type: string }[]>,
): Promise<{ valid: boolean; signer: string; error?: string }> {
  try {
    const { address, signedData } = body;
    const signature = signedData?.signature;
    const decodedMessage = signedData?.message
      ? JSON.parse(Buffer.from(signedData.message, 'base64').toString('utf-8'))
      : null;

    if (!signature) return { valid: false, signer: '', error: 'Missing signature' };
    if (!decodedMessage) return { valid: false, signer: '', error: 'Missing signed message' };

    const signer = body.address?.toLowerCase();

    const valid = await verifyTypedData({
      address: signer as `0x${string}`,
      domain: DOMAIN_SEPARATOR,
      types: messageTypes,
      primaryType: Object.keys(messageTypes)[0] as string,
      message: decodedMessage,
      signature: signature as `0x${string}`,
    });

    if (!valid) return { valid: false, signer, error: 'Invalid EIP-712 signature' };

    return { valid: true, signer };
  } catch (e: any) {
    return { valid: false, signer: '', error: `Signature verification failed: ${e.message}` };
  }
}

export function extractSignedPayload(body: any): any {
  if (body.signedData?.message) {
    return JSON.parse(Buffer.from(body.signedData.message, 'base64').toString('utf-8'));
  }
  return body;
}

export function unauthorizedResponse(message: string = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}
