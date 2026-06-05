'use client';

import { get } from '@/lib/api-client';
import { useEffect, useState } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useHouse(address: string) {
  const [state, setState] = useState<UseApiState<any>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchHouse() {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await get<any>(`/api/houses/contract/${address}`);
        if (!cancelled) setState({ data, loading: false, error: null });
      } catch (err) {
        if (!cancelled) setState({ data: null, loading: false, error: (err as Error).message });
      }
    }

    if (address) fetchHouse();

    return () => {
      cancelled = true;
    };
  }, [address]);

  return state;
}

export function useRound(roundId: number) {
  const [state, setState] = useState<UseApiState<any>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchRound() {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await get<any>(`/api/rounds/${roundId}`);
        if (!cancelled) setState({ data, loading: false, error: null });
      } catch (err) {
        if (!cancelled) setState({ data: null, loading: false, error: (err as Error).message });
      }
    }

    if (roundId) fetchRound();

    return () => {
      cancelled = true;
    };
  }, [roundId]);

  return state;
}

export function useProposal(proposalId: number) {
  const [state, setState] = useState<UseApiState<any>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchProposal() {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await get<any>(`/api/proposals/${proposalId}`);
        if (!cancelled) setState({ data, loading: false, error: null });
      } catch (err) {
        if (!cancelled) setState({ data: null, loading: false, error: (err as Error).message });
      }
    }

    if (proposalId) fetchProposal();

    return () => {
      cancelled = true;
    };
  }, [proposalId]);

  return state;
}

export function useHouses() {
  const [state, setState] = useState<UseApiState<any[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchHouses() {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await get<any[]>('/api/houses');
        if (!cancelled) setState({ data, loading: false, error: null });
      } catch (err) {
        if (!cancelled) setState({ data: null, loading: false, error: (err as Error).message });
      }
    }

    fetchHouses();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export function useProposalsByAddress(address: string) {
  const [state, setState] = useState<UseApiState<any[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchProposals() {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await get<any[]>('/api/proposals');
        const filtered = data.filter((p: any) => p.address === address.toLowerCase());
        if (!cancelled) setState({ data: filtered, loading: false, error: null });
      } catch (err) {
        if (!cancelled) setState({ data: null, loading: false, error: (err as Error).message });
      }
    }

    if (address) fetchProposals();

    return () => {
      cancelled = true;
    };
  }, [address]);

  return state;
}

export function useVotesByAddress(address: string) {
  const [state, setState] = useState<UseApiState<any[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchVotes() {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await get<any[]>(`/api/votes?address=${address}`);
        if (!cancelled) setState({ data, loading: false, error: null });
      } catch (err) {
        if (!cancelled) setState({ data: null, loading: false, error: (err as Error).message });
      }
    }

    if (address) fetchVotes();

    return () => {
      cancelled = true;
    };
  }, [address]);

  return state;
}
