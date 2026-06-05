'use client';

import { useAccount } from 'wagmi';
import { useState } from 'react';

/**
 * Fetch voting power for a user in a round.
 * Stub — returns 0 until the SDK on-chain integration is wired in Phase 7.
 */
export function useVotingPower(roundAddress?: string) {
  const { address } = useAccount();

  return {
    votingPower: 0,
    loading: false,
    error: null,
    address,
  };
}

/**
 * Check whether the connected wallet can propose in a round.
 * Stub — returns true until SDK strategy resolution is wired.
 */
export function useCanPropose(roundAddress?: string) {
  const { address, isConnected } = useAccount();

  return {
    canPropose: isConnected,
    loading: false,
    error: null,
    address,
  };
}

/**
 * Fetch token balances for a round contract.
 * Stub — returns empty until SDK asset queries are wired.
 */
export function useRoundBalances(roundId?: number) {
  const [state] = useState({ data: null, loading: false, error: null });

  return {
    balances: [],
    ...state,
  };
}

/**
 * Fetch on-chain metadata (name, symbol, decimals) for a token address.
 * Stub — returns null until SDK token queries are wired.
 */
export function useAssetMetadata(tokenAddress?: string) {
  return {
    name: null,
    symbol: null,
    decimals: 18,
    loading: false,
    error: null,
  };
}

/**
 * Fetch and submit replies for a proposal.
 * Stub — will be wired to Supabase in Phase 8.
 */
export function useReplies(proposalId?: number) {
  const { address } = useAccount();

  return {
    replies: [],
    loading: false,
    error: null,
    submitReply: async (_content: string) => {
      console.warn('Replies not yet wired — coming in Phase 8');
    },
  };
}
