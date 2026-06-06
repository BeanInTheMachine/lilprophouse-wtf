'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { useRound } from '@/lib/hooks/useApi';
import { useCancelRound, useFinalizeRound, useClaimAward, useRoundChainState } from '@/lib/hooks/useOnChain';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import Link from 'next/link';
import { useState } from 'react';

export default function RoundManagerPage() {
  const params = useParams<{ roundId: string }>();
  const roundId = parseInt(params.roundId, 10);
  const router = useRouter();
  const { address } = useAccount();
  const { data: round, loading, error: fetchError } = useRound(roundId);
  const { state: chainState, owner: chainOwner } = useRoundChainState(round?.contractAddress ?? undefined);

  const { cancelRound, isPending: cancelling } = useCancelRound();
  const { finalizeRound, isPending: finalizing } = useFinalizeRound();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionLabel, setActionLabel] = useState<string | null>(null);

  const { isLoading: waiting } = useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  if (loading) return <LoadingIndicator />;
  if (fetchError || !round) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-brand-black mb-2">Round not found</h2>
        <Link href="/app" className="text-brand-purple font-bold hover:underline">&larr; Browse rounds</Link>
      </div>
    );
  }

  const isOwner = chainOwner ? chainOwner.toLowerCase() === address?.toLowerCase() : true;

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel this round? This cannot be undone.')) return;
    if (!round?.contractAddress) {
      setActionError('Round not deployed on-chain');
      return;
    }
    setActionLabel('cancel');
    setActionError('');
    try {
      const hash = await cancelRound(round.contractAddress);
      setTxHash(hash);
      router.push(`/rounds/${roundId}`);
    } catch (e: any) {
      setActionError(e.message ?? 'Failed to cancel round');
      setActionLabel(null);
    }
  }

  async function handleFinalize() {
    if (!confirm('Finalize this round? Winners will be selected.')) return;
    if (!round?.contractAddress) {
      setActionError('Round not deployed on-chain');
      return;
    }
    setActionLabel('finalize');
    setActionError('');
    try {
      const hash = await finalizeRound(round.contractAddress);
      setTxHash(hash);
      router.push(`/rounds/${roundId}`);
    } catch (e: any) {
      setActionError(e.message ?? 'Failed to finalize round');
      setActionLabel(null);
    }
  }

  const isBusy = cancelling || finalizing || waiting;

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
            {round.contractAddress && (
              <div className="col-span-2">
                <span className="text-brand-gray">Contract</span>
                <p className="font-bold text-brand-black font-mono text-xs break-all">{round.contractAddress}</p>
              </div>
            )}
          </div>
        </Card>

        {/* On-chain state */}
        {round.contractAddress && chainState !== undefined && (
          <Card className="p-6">
            <h3 className="font-bold text-lg text-brand-black mb-4">On-Chain State</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['State', String(chainState)],
                ['Owner', chainOwner ? `${chainOwner.slice(0, 6)}...${chainOwner.slice(-4)}` : 'Unknown'],
              ].map(([label, value]) => (
                <div key={label}>
                  <span className="text-brand-gray">{label}</span>
                  <p className="font-bold text-brand-black">{value}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Actions */}
        <Card className="p-6">
          <h3 className="font-bold text-lg text-brand-black mb-4">Actions</h3>
          <div className="flex flex-col gap-3">
            {(round.state === 'ACCEPTING_PROPOSALS' || round.state === 'VOTING') && (
              <Button variant="outline" onClick={handleCancel} disabled={isBusy} className="border-brand-red text-brand-red hover:bg-brand-red-hint">
                {actionLabel === 'cancel' && waiting ? 'Confirming...' : actionLabel === 'cancel' ? 'Signing...' : 'Cancel Round'}
              </Button>
            )}
            {(round.state === 'VOTING' || round.state === 'COMPLETED') && (
              <Button onClick={handleFinalize} disabled={isBusy}>
                {actionLabel === 'finalize' && waiting ? 'Confirming...' : actionLabel === 'finalize' ? 'Signing...' : 'Finalize Round'}
              </Button>
            )}
            {(round.state === 'COMPLETED' || round.state === 'CANCELLED') && (
              <p className="text-sm text-brand-gray text-center py-2">No actions available for completed or cancelled rounds.</p>
            )}
            {!isOwner && (
              <p className="text-xs text-brand-gray text-center">Only the round owner can perform actions.</p>
            )}
          </div>
        </Card>

        {/* Deposit */}
        <Card className="p-6">
          <h3 className="font-bold text-lg text-brand-black mb-4">Deposit Assets</h3>
          <p className="text-sm text-brand-gray">
            {round.contractAddress
              ? `Fund this round by directly sending assets to ${round.contractAddress.slice(0, 6)}...${round.contractAddress.slice(-4)}.`
              : 'Deposit assets after the round is deployed on-chain.'}
          </p>
        </Card>
      </div>
    </div>
  );
}
