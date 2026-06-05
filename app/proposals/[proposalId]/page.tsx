'use client';

import { useParams } from 'next/navigation';
import { useProposal } from '@/lib/hooks/useApi';
import Link from 'next/link';
import dayjs from 'dayjs';

export default function ProposalPage() {
  const params = useParams<{ proposalId: string }>();
  const proposalId = parseInt(params.proposalId, 10);
  const { data: proposal, loading, error } = useProposal(proposalId);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-border-light rounded" />
          <div className="h-4 w-32 bg-border-light rounded" />
          <div className="h-64 bg-border-light rounded-2xl mt-8" />
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-brand-black mb-2">Proposal not found</h2>
        <p className="text-brand-gray mb-6">{error ?? 'The requested proposal could not be loaded.'}</p>
        <Link href="/app" className="text-brand-purple font-bold hover:underline">
          &larr; Browse rounds
        </Link>
      </div>
    );
  }

  const totalVotes = proposal.voteCountFor + proposal.voteCountAgainst;
  const forPercent = totalVotes > 0 ? (proposal.voteCountFor / totalVotes) * 100 : 0;
  const againstPercent = totalVotes > 0 ? (proposal.voteCountAgainst / totalVotes) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href={proposal.roundId ? `/rounds/${proposal.roundId}` : '/app'}
        className="inline-flex items-center text-sm font-medium text-brand-gray hover:text-brand-black mb-6 transition-colors"
      >
        &larr; Back to round
      </Link>

      <article className="max-w-2xl">
        <h1 className="font-londrina text-3xl text-brand-black mb-2">{proposal.title}</h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-brand-gray mb-6">
          <span>
            by{' '}
            <span className="font-medium text-brand-black font-mono text-xs">
              {proposal.address.slice(0, 6)}...{proposal.address.slice(-4)}
            </span>
          </span>
          <span>&middot;</span>
          <span>{dayjs(proposal.createdAt).format('MMMM D, YYYY')}</span>
          {proposal.reqAmount && (
            <>
              <span>&middot;</span>
              <span>Requested: <span className="font-bold text-brand-black">{String(proposal.reqAmount)}</span></span>
            </>
          )}
        </div>

        <p className="text-brand-black font-medium text-lg leading-relaxed mb-6">
          {proposal.tldr}
        </p>

        <div
          className="proposalContent border-t border-border-light pt-6"
          dangerouslySetInnerHTML={{ __html: proposal.content }}
        />
      </article>

      {totalVotes > 0 && (
        <div className="max-w-2xl mt-10 bg-surface-light border border-border-light rounded-2xl p-6 shadow-low">
          <h3 className="font-bold text-lg text-brand-black mb-4">Vote Distribution</h3>

          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-bold text-brand-green w-16">FOR</span>
            <div className="flex-1 h-3 bg-border-light rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-green rounded-full transition-all"
                style={{ width: `${forPercent}%` }}
              />
            </div>
            <span className="text-sm font-bold text-brand-black w-20 text-right">
              {proposal.voteCountFor} ({Math.round(forPercent)}%)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-brand-red w-16">AGAINST</span>
            <div className="flex-1 h-3 bg-border-light rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-red rounded-full transition-all"
                style={{ width: `${againstPercent}%` }}
              />
            </div>
            <span className="text-sm font-bold text-brand-black w-20 text-right">
              {proposal.voteCountAgainst} ({Math.round(againstPercent)}%)
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-border-light text-sm text-brand-gray text-center">
            {totalVotes} total vote{totalVotes !== 1 ? 's' : ''} cast
          </div>
        </div>
      )}
    </div>
  );
}
