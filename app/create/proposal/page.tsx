'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import ProposalEditor from '@/components/proposal/ProposalEditor';
import ConnectToContinue from '@/components/web3/ConnectToContinue';
import { useProposeOnChain } from '@/lib/hooks/useOnChain';
import { post } from '@/lib/api-client';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function CreateProposalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roundId = searchParams.get('round');
  const roundAddress = searchParams.get('address');
  const { address, isConnected } = useAccount();
  const { propose, isPending: deploying } = useProposeOnChain();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'onchain' | 'db'>(
    roundAddress && process.env.NEXT_PUBLIC_SKIP_ONCHAIN !== 'true' ? 'onchain' : 'db'
  );

  const { isLoading: waiting, data: receipt } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
  });

  // When on-chain tx confirms, also store in DB and navigate
  useEffect(() => {
    (async () => {
      if (!receipt || !address || !roundId) return;
      try {
        await post('/api/proposals', {
          title: '', content: '', tldr: '',
          address, roundId: Number(roundId),
        });
        router.push(roundId ? `/rounds/${roundId}` : '/app');
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt]);

  async function handleSubmit(data: { title: string; tldr: string; content: string; reqAmount?: number }) {
    if (!address) return;
    setLoading(true);
    setError('');

    if (mode === 'onchain' && roundAddress) {
      try {
        const hash = await propose(
          roundAddress,
          data.title.trim(),
          data.content.trim(),
          data.tldr.trim(),
          data.reqAmount ?? 0,
        );
        setTxHash(hash);
      } catch (e: any) {
        setError(e.message ?? 'Transaction failed');
        setLoading(false);
      }
      return;
    }

    // Off-chain mode
    try {
      await post('/api/proposals', {
        ...data,
        address,
        roundId: roundId ? Number(roundId) : 1,
      });
      router.push(roundId ? `/rounds/${roundId}` : '/app');
    } catch (e: any) {
      setError(e.message ?? 'Failed to create proposal');
    } finally {
      setLoading(false);
    }
  }

  const isBusy = deploying || waiting || loading;

  return (
    <ConnectToContinue>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link
          href={roundId ? `/rounds/${roundId}` : '/app'}
          className="inline-flex items-center text-sm font-medium text-brand-gray hover:text-brand-black mb-6"
        >
          &larr; Back to round
        </Link>

        <h1 className="font-londrina text-3xl text-brand-black mb-2">Create Proposal</h1>
        <p className="text-brand-gray mb-2">
          {mode === 'onchain'
            ? 'Submit your idea on-chain. Content is stored permanently on Base.'
            : 'Submit your idea for community funding.'}
        </p>

        {roundAddress && process.env.NEXT_PUBLIC_SKIP_ONCHAIN !== 'true' && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('onchain')}
              className={`text-xs px-3 py-1 rounded-full font-bold ${mode === 'onchain' ? 'bg-brand-purple text-white' : 'bg-border-light text-brand-gray'}`}
            >
              On-Chain (~$0.20)
            </button>
            <button
              onClick={() => setMode('db')}
              className={`text-xs px-3 py-1 rounded-full font-bold ${mode === 'db' ? 'bg-brand-purple text-white' : 'bg-border-light text-brand-gray'}`}
            >
              Off-Chain (free)
            </button>
          </div>
        )}

        {error && (
          <div className="bg-brand-red-hint border border-brand-red-semi-transparent rounded-xl px-4 py-3 text-sm font-medium text-brand-red mb-6">
            {error}
          </div>
        )}

        {waiting && (
          <div className="bg-brand-green-hint border border-brand-green-semi-transparent rounded-xl px-4 py-3 text-sm font-medium text-brand-green mb-6">
            Transaction confirmed. Proposal is now live on Base.
          </div>
        )}

        {txHash && (
          <div className="text-center py-8">
            <p className="text-brand-gray">Waiting for transaction to confirm...</p>
            <p className="text-xs text-brand-gray mt-1 font-mono">{txHash.slice(0, 20)}...</p>
          </div>
        )}

        {!txHash && (
          <ProposalEditor onSubmit={handleSubmit} isLoading={isBusy} showReqAmount={!!roundId} />
        )}
      </div>
    </ConnectToContinue>
  );
}
