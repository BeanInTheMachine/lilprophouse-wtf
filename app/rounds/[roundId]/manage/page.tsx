'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRound } from '@/lib/hooks/useApi';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import Link from 'next/link';
import { useState } from 'react';
import { post } from '@/lib/api-client';

export default function RoundManagerPage() {
  const params = useParams<{ roundId: string }>();
  const roundId = parseInt(params.roundId, 10);
  const router = useRouter();
  const { data: round, loading, error: fetchError } = useRound(roundId);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  if (loading) return <LoadingIndicator />;
  if (fetchError || !round) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-brand-black mb-2">Round not found</h2>
        <Link href="/app" className="text-brand-purple font-bold hover:underline">&larr; Browse rounds</Link>
      </div>
    );
  }

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel this round? This cannot be undone.')) return;
    setActionLoading('cancel');
    setActionError('');
    try {
      await post(`/api/rounds/${roundId}/cancel`, {});
      router.push(`/rounds/${roundId}`);
    } catch (e: any) {
      setActionError(e.message ?? 'Failed to cancel round');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleFinalize() {
    if (!confirm('Finalize this round? Winners will be selected.')) return;
    setActionLoading('finalize');
    setActionError('');
    try {
      await post(`/api/rounds/${roundId}/finalize`, {});
      router.push(`/rounds/${roundId}`);
    } catch (e: any) {
      setActionError(e.message ?? 'Failed to finalize round');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link href={`/rounds/${roundId}`} className="inline-flex items-center text-sm font-medium text-brand-gray hover:text-brand-black mb-6">
        &larr; Back to round
      </Link>

      <h1 className="font-londrina text-3xl text-brand-black mb-2">Manage Round</h1>
      <p className="text-brand-gray mb-8">{round.title}</p>

      {actionError && (
        <div className="bg-brand-red-hint border border-brand-red-semi-transparent rounded-xl px-4 py-3 text-sm font-medium text-brand-red mb-6">
          {actionError}
        </div>
      )}

      <div className="grid gap-6">
        {/* Round Info */}
        <Card className="p-6">
          <h3 className="font-bold text-lg text-brand-black mb-4">Round Information</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Status', round.state],
              ['Type', round.type],
              ['Funding', `${String(round.fundingAmount)} ${round.currencyType ?? ''}`],
              ['Winners', String(round.numWinners)],
              ['Proposals', String(round.proposals?.length ?? 0)],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="text-brand-gray">{label}</span>
                <p className="font-bold text-brand-black">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Actions */}
        <Card className="p-6">
          <h3 className="font-bold text-lg text-brand-black mb-4">Actions</h3>
          <div className="flex flex-col gap-3">
            {(round.state === 'ACCEPTING_PROPOSALS' || round.state === 'VOTING') && (
              <Button variant="outline" onClick={handleCancel} disabled={actionLoading !== null} className="border-brand-red text-brand-red hover:bg-brand-red-hint">
                {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel Round'}
              </Button>
            )}
            {round.state === 'VOTING' && (
              <Button onClick={handleFinalize} disabled={actionLoading !== null}>
                {actionLoading === 'finalize' ? 'Finalizing...' : 'Finalize Round'}
              </Button>
            )}
            {(round.state === 'COMPLETED' || round.state === 'CANCELLED') && (
              <p className="text-sm text-brand-gray text-center py-2">No actions available for {round.state.toLowerCase()} rounds.</p>
            )}
          </div>
        </Card>

        {/* Deposit */}
        <Card className="p-6">
          <h3 className="font-bold text-lg text-brand-black mb-4">Deposit Assets</h3>
          <p className="text-sm text-brand-gray mb-4">Fund this round by depositing assets to the round contract.</p>
          <Button disabled>Coming soon</Button>
        </Card>
      </div>
    </div>
  );
}
