'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import ProposalEditor from '@/components/proposal/ProposalEditor';
import ConnectToContinue from '@/components/web3/ConnectToContinue';
import Link from 'next/link';
import { post } from '@/lib/api-client';

export default function CreateProposalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roundId = searchParams.get('round');
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(data: { title: string; tldr: string; content: string; reqAmount?: number }) {
    if (!address) return;
    setLoading(true);
    setError('');
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
        <p className="text-brand-gray mb-8">Submit your idea for community funding.</p>

        {error && (
          <div className="bg-brand-red-hint border border-brand-red-semi-transparent rounded-xl px-4 py-3 text-sm font-medium text-brand-red mb-6">
            {error}
          </div>
        )}

        <ProposalEditor onSubmit={handleSubmit} isLoading={loading} showReqAmount={!!roundId} />
      </div>
    </ConnectToContinue>
  );
}
