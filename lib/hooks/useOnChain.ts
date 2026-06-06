'use client';

import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { type Address, parseAbi, encodeAbiParameters } from 'viem';
import { useState } from 'react';
import { post } from '@/lib/api-client';
import {
  PROP_HOUSE_ABI,
  TIMED_ROUND_ABI,
  INFINITE_ROUND_ABI,
  COMMUNITY_HOUSE_ABI,
  CREATOR_PASS_ISSUER_ABI,
} from '@/lib/contracts/abis';
import {
  PROP_HOUSE_ADDRESS,
  COMMUNITY_HOUSE_IMPL,
  TIMED_ROUND_IMPL,
  CREATOR_PASS_ISSUER_ADDRESS,
} from '@/lib/contracts/addresses';

/**
 * Fetch on-chain houses for the connected wallet.
 */
export function useHousesOnChain() {
  const { address } = useAccount();

  const { data, isLoading } = useReadContract({
    address: PROP_HOUSE_ADDRESS,
    abi: PROP_HOUSE_ABI,
    functionName: 'getHousesForAccount',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return {
    houses: data as `0x${string}`[] | undefined,
    loading: isLoading,
    error: null,
  };
}

/**
 * Fetch on-chain rounds for a given house.
 */
export function useRoundsOnChain(houseAddress?: string) {
  const { data, isLoading } = useReadContract({
    address: PROP_HOUSE_ADDRESS,
    abi: PROP_HOUSE_ABI,
    functionName: 'getRoundsForHouse',
    args: houseAddress ? [houseAddress as Address] : undefined,
    query: { enabled: !!houseAddress },
  });

  return {
    rounds: data as `0x${string}`[] | undefined,
    loading: isLoading,
    error: null,
  };
}

/**
 * Fetch on-chain house metadata.
 */
export function useHouseMetadata(houseAddress?: string) {
  const { data, isLoading } = useReadContract({
    address: houseAddress as Address | undefined,
    abi: COMMUNITY_HOUSE_ABI,
    functionName: 'name',
    query: { enabled: !!houseAddress },
  });

  const { data: description } = useReadContract({
    address: houseAddress as Address | undefined,
    abi: COMMUNITY_HOUSE_ABI,
    functionName: 'description',
    query: { enabled: !!houseAddress },
  });

  return {
    name: data as string | undefined,
    description: description as string | undefined,
    loading: isLoading,
  };
}

/**
 * Fetch on-chain round state from a TimedRound or InfiniteRound contract.
 */
export function useRoundChainState(roundAddress?: string) {
  const { data: state } = useReadContract({
    address: roundAddress as Address | undefined,
    abi: TIMED_ROUND_ABI,
    functionName: 'state',
    query: { enabled: !!roundAddress },
  });

  const { data: owner } = useReadContract({
    address: roundAddress as Address | undefined,
    abi: TIMED_ROUND_ABI,
    functionName: 'owner',
    query: { enabled: !!roundAddress },
  });

  const { data: proposalCount } = useReadContract({
    address: roundAddress as Address | undefined,
    abi: TIMED_ROUND_ABI,
    functionName: 'proposalCount',
    query: { enabled: !!roundAddress },
  });

  return {
    state: state as number | undefined,
    owner: owner as string | undefined,
    proposalCount: proposalCount as bigint | undefined,
    loading: false,
  };
}

/**
 * Deploy a new community house on-chain via the PropHouse factory.
 */
export function useCreateHouseOnChain() {
  const { writeContractAsync, isPending } = useWriteContract();
  const [error, setError] = useState<string | null>(null);

  async function createHouse(name: string, description: string, imageURI: string) {
    setError(null);
    try {
      if (process.env.NEXT_PUBLIC_SKIP_ONCHAIN === 'true') {
        return `0x${'0'.repeat(64)}` as `0x${string}`;
      }

      const config = encodeAbiParameters(
        [{ type: 'string' }, { type: 'string' }, { type: 'string' }],
        [name, description, imageURI],
      );

      const tx = await writeContractAsync({
        address: PROP_HOUSE_ADDRESS,
        abi: PROP_HOUSE_ABI,
        functionName: 'createHouse',
        args: [{ impl: COMMUNITY_HOUSE_IMPL, config }],
      });
      return tx;
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed');
      throw e;
    }
  }

  return { createHouse, isPending, error };
}

/**
 * Deploy a new timed round on an existing house.
 */
export function useCreateTimedRoundOnChain() {
  const { writeContractAsync, isPending } = useWriteContract();
  const [error, setError] = useState<string | null>(null);

  async function createTimedRound(
    houseAddress: string,
    title: string,
    description: string,
    proposalPeriodStartTimestamp: number,
    proposalPeriodDurationSecs: number,
    votePeriodDurationSecs: number,
    numWinners: number,
  ) {
    setError(null);
    try {
      if (process.env.NEXT_PUBLIC_SKIP_ONCHAIN === 'true') {
        return `0x${'0'.repeat(64)}` as `0x${string}`;
      }
      const roundConfig = encodeAbiParameters(
        [
          { type: 'uint256' },
          { type: 'uint256' },
          { type: 'uint256' },
          { type: 'uint256' },
        ],
        [BigInt(proposalPeriodStartTimestamp), BigInt(proposalPeriodDurationSecs), BigInt(votePeriodDurationSecs), BigInt(numWinners)],
      );

      const tx = await writeContractAsync({
        address: PROP_HOUSE_ADDRESS,
        abi: PROP_HOUSE_ABI,
        functionName: 'createRoundOnExistingHouse',
        args: [
          houseAddress as Address,
          {
            impl: TIMED_ROUND_IMPL,
            config: roundConfig,
            title,
            description,
          },
        ],
      });
      return tx;
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed');
      throw e;
    }
  }

  return { createTimedRound, isPending, error };
}

/**
 * Cancel a round (only callable by round owner).
 */
export function useCancelRound() {
  const { writeContractAsync, isPending } = useWriteContract();
  const [error, setError] = useState<string | null>(null);

  async function cancelRound(roundAddress: string) {
    setError(null);
    try {
      const tx = await writeContractAsync({
        address: roundAddress as Address,
        abi: TIMED_ROUND_ABI,
        functionName: 'cancel',
      });
      return tx;
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed');
      throw e;
    }
  }

  return { cancelRound, isPending, error };
}

/**
 * Finalize a timed round (anyone can call after voting ends).
 */
export function useFinalizeRound() {
  const { writeContractAsync, isPending } = useWriteContract();
  const [error, setError] = useState<string | null>(null);

  async function finalizeRound(roundAddress: string) {
    setError(null);
    try {
      const tx = await writeContractAsync({
        address: roundAddress as Address,
        abi: TIMED_ROUND_ABI,
        functionName: 'finalize',
      });
      return tx;
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed');
      throw e;
    }
  }

  return { finalizeRound, isPending, error };
}

/**
 * Claim an award for a winning proposal.
 */
export function useClaimAward() {
  const { writeContractAsync, isPending } = useWriteContract();
  const [error, setError] = useState<string | null>(null);

  async function claimAward(roundAddress: string, proposalId: number) {
    setError(null);
    try {
      const tx = await writeContractAsync({
        address: roundAddress as Address,
        abi: TIMED_ROUND_ABI,
        functionName: 'claim',
        args: [BigInt(proposalId)],
      });
      return tx;
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed');
      throw e;
    }
  }

  return { claimAward, isPending, error };
}

/**
 * Check if the connected wallet holds a creator pass for a given house.
 */
export function useHasCreatorPass(houseId?: number) {
  const { address } = useAccount();

  const { data, isLoading } = useReadContract({
    address: CREATOR_PASS_ISSUER_ADDRESS,
    abi: CREATOR_PASS_ISSUER_ABI,
    functionName: 'balanceOf',
    args: address && houseId !== undefined ? [address as Address, BigInt(houseId)] : undefined,
    query: { enabled: !!address && houseId !== undefined },
  });

  return {
    hasPass: data ? (data as bigint) > BigInt(0) : false,
    loading: isLoading,
  };
}

/**
 * Issue a creator pass to an address (only callable by house owner).
 */
export function useIssueCreatorPass() {
  const { writeContractAsync, isPending } = useWriteContract();
  const [error, setError] = useState<string | null>(null);

  async function issuePass(houseId: number, to: string) {
    setError(null);
    try {
      const tx = await writeContractAsync({
        address: CREATOR_PASS_ISSUER_ADDRESS,
        abi: CREATOR_PASS_ISSUER_ABI,
        functionName: 'safeTransferFrom',
        args: ['0x0000000000000000000000000000000000000000' as Address, to as Address, BigInt(houseId), BigInt(1), '0x'],
      });
      return tx;
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed');
      throw e;
    }
  }

  return { issuePass, isPending, error };
}
