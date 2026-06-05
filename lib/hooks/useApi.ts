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

export function useRounds(houseId: number) {
  const [state, setState] = useState<UseApiState<any[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchRounds() {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await get<any[]>(`/api/rounds?houseId=${houseId}`);
        if (!cancelled) setState({ data, loading: false, error: null });
      } catch (err) {
        if (!cancelled) setState({ data: null, loading: false, error: (err as Error).message });
      }
    }

    if (houseId) fetchRounds();

    return () => {
      cancelled = true;
    };
  }, [houseId]);

  return state;
}

export function useProposals(roundId: number) {
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
        const data = await get<any[]>(`/api/rounds/${roundId}/proposals`);
        if (!cancelled) setState({ data, loading: false, error: null });
      } catch (err) {
        if (!cancelled) setState({ data: null, loading: false, error: (err as Error).message });
      }
    }

    if (roundId) fetchProposals();

    return () => {
      cancelled = true;
    };
  }, [roundId]);

  return state;
}

export function useFeaturedRounds() {
  const [state, setState] = useState<UseApiState<any[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await get<any[]>('/api/rounds?state=active');
        if (!cancelled) setState({ data, loading: false, error: null });
      } catch (err) {
        if (!cancelled) setState({ data: null, loading: false, error: (err as Error).message });
      }
    }

    fetch();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export function usePlatformStats() {
  const [state, setState] = useState<UseApiState<{ houses: number; rounds: number; proposals: number; votes: number }>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await get<any>('/api/stats');
        if (!cancelled) setState({ data, loading: false, error: null });
      } catch (err) {
        if (!cancelled) setState({ data: null, loading: false, error: (err as Error).message });
      }
    }

    fetch();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
