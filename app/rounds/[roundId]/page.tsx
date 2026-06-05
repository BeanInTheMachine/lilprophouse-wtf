'use client';

import { useParams } from 'next/navigation';
import { useRound } from '@/lib/hooks/useApi';
import StatusPill from '@/components/ui/StatusPill';
import Link from 'next/link';
import dayjs from 'dayjs';

export default function RoundPage() {
  const params = useParams<{ roundId: string }>();
  const roundId = parseInt(params.roundId, 10);
  const { data: round, loading, error } = useRound(roundId);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-border-light rounded" />
          <div className="h-4 w-96 bg-border-light rounded" />
          <div className="grid gap-4 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-border-light rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !round) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-brand-black mb-2">Round not found</h2>
        <p className="text-brand-gray mb-6">{error ?? 'The requested round could not be loaded.'}</p>
        <Link href="/app" className="text-brand-purple font-bold hover:underline">
          &larr; Browse rounds
        </Link>
      </div>
    );
  }

  const proposals = round.proposals ?? [];
  const isTimed = round.type === 'TIMED';

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/app"
        className="inline-flex items-center text-sm font-medium text-brand-gray hover:text-brand-black mb-6 transition-colors"
      >
        &larr; Browse rounds
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <h1 className="font-londrina text-3xl text-brand-black">{round.title}</h1>
          <StatusPill state={round.state} />
        </div>

        {round.description && (
          <p className="text-brand-gray leading-relaxed max-w-2xl mb-4">{round.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-brand-gray">
          <span>
            <span className="font-bold text-brand-black">
              {Number(round.fundingAmount)} {round.currencyType ?? ''}
            </span>{' '}
            &times; {round.numWinners} winner{round.numWinners !== 1 ? 's' : ''}
          </span>
          <span>&middot;</span>
          <span>
            {isTimed ? (
              <>
                {dayjs(round.startTime).format('MMM D, YYYY')} &ndash;{' '}
                {round.votingEndTime ? dayjs(round.votingEndTime).format('MMM D, YYYY') : 'Ongoing'}
              </>
            ) : (
              <>Started {dayjs(round.startTime).format('MMM D, YYYY')}</>
            )}
          </span>
        </div>
      </div>

      {isTimed && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-surface-dark rounded-xl p-4 text-center">
            <p className="text-xs text-brand-gray font-bold uppercase tracking-wider mb-1">
              Proposals
            </p>
            <p className="font-londrina text-lg text-brand-black">
              {dayjs(round.startTime).format('MMM D')} &ndash;{' '}
              {round.proposalEndTime ? dayjs(round.proposalEndTime).format('MMM D, YYYY') : '—'}
            </p>
          </div>
          <div className="bg-surface-dark rounded-xl p-4 text-center">
            <p className="text-xs text-brand-gray font-bold uppercase tracking-wider mb-1">
              Voting
            </p>
            <p className="font-londrina text-lg text-brand-black">
              {round.proposalEndTime ? dayjs(round.proposalEndTime).format('MMM D') : '—'} &ndash;{' '}
              {round.votingEndTime ? dayjs(round.votingEndTime).format('MMM D, YYYY') : '—'}
            </p>
          </div>
          <div className="bg-surface-dark rounded-xl p-4 text-center">
            <p className="text-xs text-brand-gray font-bold uppercase tracking-wider mb-1">
              Strategy
            </p>
            <p className="font-londrina text-lg text-brand-black">
              {round.propStrategyDescription ?? 'Open'}
            </p>
          </div>
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-xl text-brand-black">
            Proposals{' '}
            <span className="text-brand-gray font-normal text-base">({proposals.length})</span>
          </h2>
        </div>

        {proposals.length === 0 ? (
          <div className="text-center py-16 text-brand-gray">
            <p className="text-lg font-medium">No proposals submitted yet.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {proposals.map((proposal: any) => {
              const totalVotes = proposal.voteCountFor + proposal.voteCountAgainst;
              const forPercent = totalVotes > 0 ? (proposal.voteCountFor / totalVotes) * 100 : 0;

              return (
                <Link
                  key={proposal.id}
                  href={`/proposals/${proposal.id}`}
                  className="block bg-surface-light border border-border-light rounded-2xl p-5 shadow-low hover:shadow-high transition-all duration-150 ease-out"
                >
                  <h3 className="font-bold text-base text-brand-black mb-1">{proposal.title}</h3>
                  <p className="text-sm text-brand-gray line-clamp-2 mb-3">{proposal.tldr}</p>

                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-brand-gray">
                      by <span className="font-medium text-brand-black font-mono text-xs">{proposal.address.slice(0, 6)}...{proposal.address.slice(-4)}</span>
                    </span>

                    {totalVotes > 0 && (
                      <>
                        <span className="text-brand-gray">&middot;</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-border-light rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-purple rounded-full"
                              style={{ width: `${forPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-brand-gray">
                            {proposal.voteCountFor} / {totalVotes}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
