'use client';

import { useAccount, useWriteContract, useReadContract, useDeployContract } from 'wagmi';
import { type Address, encodeAbiParameters } from 'viem';
import { useState } from 'react';
import { HOUSE_REGISTRY_ABI, LIL_ROUND_ABI } from '@/lib/contracts/abis';
import { HOUSE_REGISTRY_ADDRESS } from '@/lib/contracts/addresses';
import LilRoundArtifact from '@/contracts/out/LilRound.sol/LilRound.json';

/* ============================================
   READ HOOKS
   ============================================ */

/** Get on-chain house IDs for the connected wallet */
export function useHousesOnChain() {
  const { address } = useAccount();

  const { data, isLoading } = useReadContract({
    address: HOUSE_REGISTRY_ADDRESS as Address | undefined,
    abi: HOUSE_REGISTRY_ABI,
    functionName: 'getHousesForAccount',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!HOUSE_REGISTRY_ADDRESS },
  });

  return {
    houseIds: (data as bigint[] | undefined)?.map(Number),
    loading: isLoading,
  };
}

/** Get a single house's on-chain metadata */
export function useHouseOnChain(houseId?: number) {
  const { data, isLoading } = useReadContract({
    address: HOUSE_REGISTRY_ADDRESS as Address | undefined,
    abi: HOUSE_REGISTRY_ABI,
    functionName: 'getHouse',
    args: houseId !== undefined ? [BigInt(houseId)] : undefined,
    query: { enabled: houseId !== undefined && !!HOUSE_REGISTRY_ADDRESS },
  });

  const house = data as { owner: string; name: string; description: string; imageURI: string; createdAt: bigint; roundCount: bigint } | undefined;

  return {
    house,
    loading: isLoading,
  };
}

/** Read all proposals from a LilRound contract */
export function useProposalsOnChain(roundAddress?: string) {
  const { data, isLoading } = useReadContract({
    address: roundAddress as Address | undefined,
    abi: LIL_ROUND_ABI,
    functionName: 'getAllProposals',
    query: { enabled: !!roundAddress },
  });

  return {
    proposals: data as any[] | undefined,
    loading: isLoading,
  };
}

/** Read a single proposal from a LilRound contract */
export function useProposalOnChain(roundAddress?: string, proposalId?: number) {
  const { data, isLoading } = useReadContract({
    address: roundAddress as Address | undefined,
    abi: LIL_ROUND_ABI,
    functionName: 'getProposal',
    args: proposalId !== undefined ? [BigInt(proposalId)] : undefined,
    query: { enabled: !!roundAddress && proposalId !== undefined },
  });

  return {
    proposal: data as any | undefined,
    loading: isLoading,
  };
}

/** Check if a voter has voted on a proposal */
export function useHasVotedOn(roundAddress?: string, proposalId?: number, voter?: string) {
  const { data, isLoading } = useReadContract({
    address: roundAddress as Address | undefined,
    abi: LIL_ROUND_ABI,
    functionName: 'hasVotedOn',
    args: voter && proposalId !== undefined ? [voter as Address, BigInt(proposalId)] : undefined,
    query: { enabled: !!roundAddress && proposalId !== undefined && !!voter },
  });

  return {
    hasVoted: (data as boolean) ?? false,
    loading: isLoading,
  };
}

/** Read round state from LilRound contract */
export function useRoundChainState(roundAddress?: string) {
  const { data: state } = useReadContract({
    address: roundAddress as Address | undefined,
    abi: LIL_ROUND_ABI,
    functionName: 'state',
    query: { enabled: !!roundAddress },
  });

  const { data: owner } = useReadContract({
    address: roundAddress as Address | undefined,
    abi: LIL_ROUND_ABI,
    functionName: 'owner',
    query: { enabled: !!roundAddress },
  });

  const { data: totalDeposited } = useReadContract({
    address: roundAddress as Address | undefined,
    abi: LIL_ROUND_ABI,
    functionName: 'totalDeposited',
    query: { enabled: !!roundAddress },
  });

  const { data: numWinners } = useReadContract({
    address: roundAddress as Address | undefined,
    abi: LIL_ROUND_ABI,
    functionName: 'numWinners',
    query: { enabled: !!roundAddress },
  });

  const { data: roundTitle } = useReadContract({
    address: roundAddress as Address | undefined,
    abi: LIL_ROUND_ABI,
    functionName: 'title',
    query: { enabled: !!roundAddress },
  });

  return {
    state: state as number | undefined,
    owner: owner as string | undefined,
    totalDeposited: totalDeposited as bigint | undefined,
    numWinners: numWinners as bigint | undefined,
    title: roundTitle as string | undefined,
    loading: false,
  };
}

/* ============================================
   WRITE HOOKS
   ============================================ */

/** Deploy a new house on Base via HouseRegistry.createHouse */
export function useCreateHouseOnChain() {
  const { writeContractAsync, isPending } = useWriteContract();
  const [error, setError] = useState<string | null>(null);

  async function createHouse(name: string, description: string, imageURI: string) {
    setError(null);
    if (!HOUSE_REGISTRY_ADDRESS) throw new Error('HouseRegistry not deployed');
    try {
      return await writeContractAsync({
        address: HOUSE_REGISTRY_ADDRESS,
        abi: HOUSE_REGISTRY_ABI,
        functionName: 'createHouse',
        args: [name, description, imageURI],
        chainId: 8453,
      });
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed');
      throw e;
    }
  }

  return { createHouse, isPending, error };
}

/** Deploy a new LilRound contract */
export function useCreateRoundOnChain() {
  const { deployContractAsync, isPending } = useDeployContract();
  const [error, setError] = useState<string | null>(null);

  async function createRound(
    owner: string,
    houseId: number,
    title: string,
    description: string,
    numWinners: number,
  ) {
    setError(null);
    try {
      return await deployContractAsync({
        abi: LIL_ROUND_ABI,
        bytecode: LilRoundArtifact.bytecode.object as `0x${string}`,
        args: [owner, BigInt(houseId), title, description, BigInt(numWinners)],
        chainId: 8453,
      });
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed');
      throw e;
    }
  }

  return { createRound, isPending, error };
}

/** Submit a proposal on-chain via LilRound.propose */
export function useProposeOnChain() {
  const { writeContractAsync, isPending } = useWriteContract();
  const [error, setError] = useState<string | null>(null);

  async function propose(
    roundAddress: string,
    title: string,
    content: string,
    tldr: string,
    requestedAmount: number,
  ) {
    setError(null);
    try {
      return await writeContractAsync({
        address: roundAddress as Address,
        abi: LIL_ROUND_ABI,
        functionName: 'propose',
        args: [title, content, tldr, BigInt(requestedAmount)],
      });
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed');
      throw e;
    }
  }

  return { propose, isPending, error };
}

/** Cast a vote on-chain via LilRound.vote */
export function useVoteOnChain() {
  const { writeContractAsync, isPending } = useWriteContract();
  const [error, setError] = useState<string | null>(null);

  async function vote(roundAddress: string, proposalId: number, weight: number, isFor: boolean) {
    setError(null);
    try {
      return await writeContractAsync({
        address: roundAddress as Address,
        abi: LIL_ROUND_ABI,
        functionName: 'vote',
        args: [BigInt(proposalId), BigInt(weight), isFor],
      });
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed');
      throw e;
    }
  }

  return { vote, isPending, error };
}

/** Deposit ETH into a round via LilRound.deposit */
export function useDepositToRound() {
  const { writeContractAsync, isPending } = useWriteContract();
  const [error, setError] = useState<string | null>(null);

  async function depositEth(roundAddress: string, amountEth: string) {
    setError(null);
    try {
      const amountWei = BigInt(Math.floor(parseFloat(amountEth) * 1e18));
      return await writeContractAsync({
        address: roundAddress as Address,
        abi: LIL_ROUND_ABI,
        functionName: 'deposit',
        args: [],
        value: amountWei,
      });
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed');
      throw e;
    }
  }

  return { depositEth, isPending, error };
}

/** Set winners on a LilRound (owner only) */
export function useSetWinners() {
  const { writeContractAsync, isPending } = useWriteContract();
  const [error, setError] = useState<string | null>(null);

  async function setWinners(
    roundAddress: string,
    proposalIds: number[],
    amounts: number[],
  ) {
    setError(null);
    try {
      return await writeContractAsync({
        address: roundAddress as Address,
        abi: LIL_ROUND_ABI,
        functionName: 'setWinners',
        args: [proposalIds.map((id) => BigInt(id)), amounts.map((a) => BigInt(a))],
      });
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed');
      throw e;
    }
  }

  return { setWinners, isPending, error };
}

/** Claim an award from a LilRound (winners only) */
export function useClaimAward() {
  const { writeContractAsync, isPending } = useWriteContract();
  const [error, setError] = useState<string | null>(null);

  async function claimAward(roundAddress: string, proposalId: number) {
    setError(null);
    try {
      return await writeContractAsync({
        address: roundAddress as Address,
        abi: LIL_ROUND_ABI,
        functionName: 'claim',
        args: [BigInt(proposalId)],
      });
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed');
      throw e;
    }
  }

  return { claimAward, isPending, error };
}

/** Cancel a LilRound (owner only) */
export function useCancelRound() {
  const { writeContractAsync, isPending } = useWriteContract();
  const [error, setError] = useState<string | null>(null);

  async function cancelRound(roundAddress: string) {
    setError(null);
    try {
      return await writeContractAsync({
        address: roundAddress as Address,
        abi: LIL_ROUND_ABI,
        functionName: 'cancel',
      });
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed');
      throw e;
    }
  }

  return { cancelRound, isPending, error };
}

/** Open voting phase on a LilRound (owner only) */
export function useOpenVoting() {
  const { writeContractAsync, isPending } = useWriteContract();
  const [error, setError] = useState<string | null>(null);

  async function openVoting(roundAddress: string) {
    setError(null);
    try {
      return await writeContractAsync({
        address: roundAddress as Address,
        abi: LIL_ROUND_ABI,
        functionName: 'openVoting',
      });
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed');
      throw e;
    }
  }

  return { openVoting, isPending, error };
}
