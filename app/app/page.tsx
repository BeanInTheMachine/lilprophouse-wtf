'use client';

import { useState } from 'react';
import { useFeaturedRounds } from '@/lib/hooks/useApi';
import RoundList from '@/components/RoundList';
import { get } from '@/lib/api-client';
import { useEffect } from 'react';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import { deriveRoundState } from '@/lib/roundState';

export default function BrowsePage() {
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const endpoint = tab === 'active' ? '/api/rounds?state=active' : '/api/rounds/completed';

    get<any[]>(endpoint)
      .then((data) => {
        if (!cancelled) setRounds(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Failed to load rounds');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tab]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-londrina text-3xl text-brand-black mb-2">Browse Rounds</h1>
      <p className="text-brand-gray mb-8">Discover funding rounds on Lil Rounds.</p>

      {/* Tabs */}
      <div className="flex gap-1 bg-border-light rounded-xl p-1 mb-6 max-w-xs">
        <button
          onClick={() => setTab('active')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            tab === 'active'
              ? 'bg-surface-light text-brand-black shadow-low'
              : 'text-brand-gray hover:text-brand-black'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setTab('completed')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            tab === 'completed'
              ? 'bg-surface-light text-brand-black shadow-low'
              : 'text-brand-gray hover:text-brand-black'
          }`}
        >
          Completed
        </button>
      </div>

      {error && (
        <div className="text-center py-16 text-brand-gray">
          <p className="text-lg font-medium">{error}</p>
        </div>
      )}

      {loading && <LoadingIndicator />}

      {!loading && !error && (
        <RoundList
          rounds={rounds.map((r: any) => ({
            id: r.id,
            title: r.title,
            type: r.type,
            state: deriveRoundState(r),
            fundingAmount: Number(r.fundingAmount),
            currencyType: r.currencyType,
            numWinners: r.numWinners,
            startTime: new Date(r.startTime),
            proposalEndTime: r.proposalEndTime ? new Date(r.proposalEndTime) : null,
            votingEndTime: r.votingEndTime ? new Date(r.votingEndTime) : null,
            proposalCount: r.proposals?.length ?? 0,
          }))}
          emptyMessage={
            tab === 'active'
              ? 'No active rounds right now. Check back soon or create your own!'
              : 'No completed rounds yet.'
          }
        />
      )}
    </div>
  );
}
