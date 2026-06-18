'use client';

import { useState, useEffect, useRef } from 'react';
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
  const { address } = useAccount();
  const { propose, isPending: deploying } = useProposeOnChain();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState('');
  const proposalRef = useRef<{ title: string; content: string; tldr: string } | null>(null);

  const { isLoading: waiting, data: receipt } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
  });

  useEffect(() => {
    if (!receipt || !address || !roundId || !proposalRef.current) return;
    const data = proposalRef.current;
    (async () => {
      try {
        await post('/api/proposals', {
          title: data.title,
          content: data.content,
          tldr: data.tldr,
          address,
          roundId: Number(roundId),
          reqAmount: 0,
        });
        router.push(`/rounds/${roundId}`);
      } catch (e: any) {
        setError(e.message ?? 'Failed to store proposal');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt]);

  async function handleSubmit(data: { title: string; tldr: string; content: string }) {
    if (!address || !roundAddress) return;
    setError('');
    proposalRef.current = { title: data.title.trim(), content: data.content.trim(), tldr: data.tldr.trim() };

    try {
      const hash = await propose(
        roundAddress,
        data.title.trim(),
        data.content.trim(),
        data.tldr.trim(),
      );
      setTxHash(hash);
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed');
    }
  }

  const isBusy = deploying || waiting;

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
          Submit your idea on-chain. Content is stored permanently on Base.
        </p>

        {error && (
          <div className="bg-brand-red-hint border border-brand-red-semi-transparent rounded-xl px-4 py-3 text-sm font-medium text-brand-red mb-6">
            {error}
          </div>
        )}

        {receipt && (
          <div className="bg-brand-green-hint border border-brand-green-semi-transparent rounded-xl px-4 py-3 text-sm font-medium text-brand-green mb-6">
            Transaction confirmed. Proposal is now live on Base.
          </div>
        )}

        {txHash && !receipt && (
          <div className="text-center py-8">
            <p className="text-brand-gray">Waiting for transaction to confirm...</p>
            <p className="text-xs text-brand-gray mt-1 font-mono">{txHash.slice(0, 20)}...</p>
            {roundId && (
              <Link href={`/rounds/${roundId}`} className="inline-block mt-4 text-sm text-brand-purple font-bold hover:underline">
                &larr; Back to round
              </Link>
            )}
          </div>
        )}

        {!txHash && (
          <ProposalEditor onSubmit={handleSubmit} isLoading={isBusy} />
        )}
      </div>
    </ConnectToContinue>
  );
}
