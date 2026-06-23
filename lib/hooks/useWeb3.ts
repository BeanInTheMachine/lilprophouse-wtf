'use client';

import { useAccount, useBalance, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { type Address, parseAbi } from 'viem';
import { useState, useEffect, useCallback } from 'react';
import { get, post } from '@/lib/api-client';

const ERC20_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
]);

const ERC721_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
]);

/**
 * Display-only voting power preview. Actual vote weight is computed on-chain
 * in LilRound.vote() based on the round's configured strategy.
 */
export function useVotingPower(communityTokenAddress?: string) {
  const { address } = useAccount();

  const { data: balance, isLoading } = useBalance({
    address: address as Address | undefined,
  });

  const { data: tokenBalance } = useReadContract({
    address: communityTokenAddress as Address | undefined,
    abi: ERC721_ABI,
    functionName: 'balanceOf',
    args: address ? [address as Address] : undefined,
    query: { enabled: !!communityTokenAddress && !!address },
  });

  return {
    votingPower: tokenBalance ? Number(tokenBalance) : 0,
    ethBalance: balance ? Number(balance.formatted) : 0,
    loading: isLoading,
    error: null,
    address,
  };
}

/**
 * Check whether the connected wallet can propose in a round.
 * Currently returns true if wallet is connected.
 * Will be enhanced with on-chain strategy checks once SDK is fully wired.
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
 * Reads ETH and token balances for the round contract address.
 */
export function useRoundBalances(roundAddress?: string) {
  const { data: ethBalance, isLoading: ethLoading } = useBalance({
    address: roundAddress as Address | undefined,
    query: { enabled: !!roundAddress },
  });

  return {
    balances: {
      eth: ethBalance ? Number(ethBalance.formatted) : 0,
      currency: ethBalance?.symbol ?? 'ETH',
    },
    loading: ethLoading,
    error: null,
  };
}

/**
 * Fetch on-chain metadata (name, symbol, decimals) for a token address.
 * Supports both ERC-20 and ERC-721 tokens.
 */
export function useAssetMetadata(tokenAddress?: string, tokenType: 'ERC20' | 'ERC721' = 'ERC20') {
  const abi = tokenType === 'ERC721' ? ERC721_ABI : ERC20_ABI;

  const { data: nameData } = useReadContract({
    address: tokenAddress as Address | undefined,
    abi,
    functionName: 'name',
    query: { enabled: !!tokenAddress },
  });

  const { data: symbolData } = useReadContract({
    address: tokenAddress as Address | undefined,
    abi,
    functionName: 'symbol',
    query: { enabled: !!tokenAddress },
  });

  const { data: decimalsData } = useReadContract({
    address: tokenAddress as Address | undefined,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: { enabled: !!tokenAddress && tokenType === 'ERC20' },
  });

  return {
    name: nameData as string | null,
    symbol: symbolData as string | null,
    decimals: decimalsData ? Number(decimalsData) : 18,
    loading: false,
    error: null,
  };
}

/**
 * Fetch and submit replies for a proposal via Supabase.
 */
export function useReplies(proposalId?: number) {
  const { address } = useAccount();
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!proposalId) return;

    let cancelled = false;

    async function fetch() {
      setLoading(true);
      try {
        const data = await get<any[]>(`/api/replies?proposalId=${proposalId}`);
        if (!cancelled) {
          setReplies(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();

    return () => {
      cancelled = true;
    };
  }, [proposalId]);

  const submitReply = useCallback(
    async (content: string, communityAddress: string, blockTag: number = 0) => {
      if (!address || !proposalId) throw new Error('Wallet not connected');

      const newReply = await post<any>('/api/replies', {
        content,
        address,
        proposalId,
        communityAddress,
        blockTag,
      });

      setReplies((prev) => [...prev, newReply]);
      return newReply;
    },
    [address, proposalId],
  );

  return { replies, loading, error, submitReply, address };
}
