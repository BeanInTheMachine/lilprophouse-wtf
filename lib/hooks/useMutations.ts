'use client';

import { post } from '@/lib/api-client';
import { useState } from 'react';

interface MutationState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useCreateRound() {
  const [state, setState] = useState<MutationState<any>>({
    data: null,
    loading: false,
    error: null,
  });

  async function createRound(input: {
    type: 'TIMED';
    title: string;
    description?: string;
    fundingAmount: number;
    currencyType?: string;
    numWinners: number;
    startTime: string;
    proposalEndTime?: string;
    votingEndTime?: string;
    houseId?: number;
  }) {
    setState({ data: null, loading: true, error: null });
    try {
      const data = await post<any>('/api/rounds', input);
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      setState({ data: null, loading: false, error: (err as Error).message });
      throw err;
    }
  }

  return { createRound, ...state };
}

export function useCreateProposal() {
  const [state, setState] = useState<MutationState<any>>({
    data: null,
    loading: false,
    error: null,
  });

  async function createProposal(input: {
    title: string;
    tldr: string;
    content: string;
    address: string;
    roundId: number;
    reqAmount?: number;
  }) {
    setState({ data: null, loading: true, error: null });
    try {
      const data = await post<any>('/api/proposals', input);
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      setState({ data: null, loading: false, error: (err as Error).message });
      throw err;
    }
  }

  return { createProposal, ...state };
}

export function useSubmitVotes() {
  const [state, setState] = useState<MutationState<any>>({
    data: null,
    loading: false,
    error: null,
  });

  async function submitVotes(votes: Array<{
    direction: 'FOR' | 'AGAINST' | 'ABSTAIN';
    weight: number;
    address: string;
    proposalId: number;
    roundId: number;
    communityAddress: string;
    signature: string;
    signedMessage: string;
  }>) {
    setState({ data: null, loading: true, error: null });
    try {
      const data = await post<any>('/api/votes', { votes });
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      setState({ data: null, loading: false, error: (err as Error).message });
      throw err;
    }
  }

  return { submitVotes, ...state };
}
