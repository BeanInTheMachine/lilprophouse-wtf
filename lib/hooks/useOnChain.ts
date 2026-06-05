'use client';

import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { type Address, parseAbi } from 'viem';
import { useState } from 'react';
import { post } from '@/lib/api-client';

const ROUND_FACTORY_ABI = parseAbi([
  'function createTimedRound(string title, uint256 fundingAmount, string currencyType, uint256 numWinners, uint256 startTime, uint256 proposalEndTime, uint256 votingEndTime) returns (address)',
  'function createInfiniteRound(string title, uint256 fundingAmount, string currencyType, uint256 quorumFor, uint256 quorumAgainst, uint256 votingPeriod) returns (address)',
]);

const PROPOSAL_ABI = parseAbi([
  'function submitProposal(string title, string tldr, string content) returns (uint256)',
]);

const ROUND_CONTRACT_ABI = parseAbi([
  'function propose(string title, string tldr, string content) returns (uint256)',
  'function vote(uint256 proposalId, uint8 direction, uint256 weight) external',
  'function claimAward(uint256 proposalId) external',
  'function finalize() external',
]);

/**
 * Deploy a new timed round on-chain and store metadata off-chain.
 */
export function useCreateRoundOnChain() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [error, setError] = useState<string | null>(null);

  async function createTimedRound(input: {
    title: string;
    description?: string;
    fundingAmount: number;
    currencyType: string;
    numWinners: number;
    startTime: Date;
    proposalEndTime: Date;
    votingEndTime: Date;
    houseId: number;
    propStrategy?: any;
    voteStrategy?: any;
  }) {
    setError(null);
    try {
      const tx = await writeContractAsync({
        address: process.env.NEXT_PUBLIC_ROUND_FACTORY_ADDRESS as Address,
        abi: ROUND_FACTORY_ABI,
        functionName: 'createTimedRound',
        args: [
          input.title,
          BigInt(Math.floor(input.fundingAmount * 1e18)),
          input.currencyType,
          BigInt(input.numWinners),
          BigInt(Math.floor(input.startTime.getTime() / 1000)),
          BigInt(Math.floor(input.proposalEndTime.getTime() / 1000)),
          BigInt(Math.floor(input.votingEndTime.getTime() / 1000)),
        ],
      });

      const roundRecord = await post('/api/rounds', {
        type: 'TIMED',
        title: input.title,
        description: input.description ?? null,
        fundingAmount: input.fundingAmount,
        currencyType: input.currencyType,
        numWinners: input.numWinners,
        startTime: input.startTime.toISOString(),
        proposalEndTime: input.proposalEndTime.toISOString(),
        votingEndTime: input.votingEndTime.toISOString(),
        houseId: input.houseId,
        propStrategy: input.propStrategy ?? { type: 'all' },
        voteStrategy: input.voteStrategy ?? { type: 'all' },
      });

      return roundRecord;
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed');
      throw e;
    }
  }

  return { createTimedRound, isPending, error };
}

/**
 * Submit a proposal to a round contract on-chain and store metadata off-chain.
 */
export function useSubmitProposalOnChain() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [error, setError] = useState<string | null>(null);

  async function submitProposal(input: {
    title: string;
    tldr: string;
    content: string;
    roundId: number;
    roundContractAddress: string;
    reqAmount?: number;
  }) {
    setError(null);
    try {
      const tx = await writeContractAsync({
        address: input.roundContractAddress as Address,
        abi: ROUND_CONTRACT_ABI,
        functionName: 'propose',
        args: [input.title, input.tldr, input.content],
      });

      if (!address) throw new Error('Wallet not connected');

      const proposal = await post('/api/proposals', {
        title: input.title,
        tldr: input.tldr,
        content: input.content,
        address,
        roundId: input.roundId,
        reqAmount: input.reqAmount,
      });

      return proposal;
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed');
      throw e;
    }
  }

  return { submitProposal, isPending, error };
}

/**
 * Cast votes on a round contract on-chain and store signed votes off-chain.
 */
export function useCastVoteOnChain() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [error, setError] = useState<string | null>(null);
  const publicClient = usePublicClient();

  async function castVotes(votes: Array<{
    direction: 'FOR' | 'AGAINST' | 'ABSTAIN';
    weight: number;
    proposalId: number;
    roundContractAddress: string;
    communityAddress: string;
  }>) {
    setError(null);
    try {
      if (!address) throw new Error('Wallet not connected');
      if (!publicClient) throw new Error('Public client not available');

      const block = await publicClient.getBlockNumber();

      const directionMap = { FOR: 1, AGAINST: 2, ABSTAIN: 0 };

      for (const vote of votes) {
        await writeContractAsync({
          address: vote.roundContractAddress as Address,
          abi: ROUND_CONTRACT_ABI,
          functionName: 'vote',
          args: [BigInt(vote.proposalId), directionMap[vote.direction], BigInt(vote.weight)],
        });
      }

      const voteRecords = await post('/api/votes', {
        votes: votes.map((v) => ({
          direction: v.direction,
          weight: v.weight,
          address,
          proposalId: v.proposalId,
          roundId: 0,
          blockHeight: Number(block),
          communityAddress: v.communityAddress,
          signature: '0x',
          signedMessage: '',
        })),
      });

      return voteRecords;
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed');
      throw e;
    }
  }

  return { castVotes, isPending, error };
}

/**
 * Claim an award for a winning proposal.
 */
export function useClaimAward() {
  const { writeContractAsync, isPending } = useWriteContract();
  const [error, setError] = useState<string | null>(null);

  async function claimAward(proposalId: number, roundContractAddress: string) {
    setError(null);
    try {
      const tx = await writeContractAsync({
        address: roundContractAddress as Address,
        abi: ROUND_CONTRACT_ABI,
        functionName: 'claimAward',
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
