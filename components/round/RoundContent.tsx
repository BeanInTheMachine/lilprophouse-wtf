import React from 'react';
import type { RoundState, RoundType } from '@prisma/client';
import Link from 'next/link';
import Button from '@/components/ui/Button';

interface RoundContentProps {
  title: string;
  description: string | null;
  type: RoundType;
  state: RoundState;
  fundingAmount: number;
  currencyType: string | null;
  numWinners: number;
  startTime: Date;
  proposalEndTime: Date | null;
  votingEndTime: Date | null;
  propStrategyDescription?: string | null;
  children: React.ReactNode;
  houseContractAddress?: string;
  roundId: number;
}

export default function RoundContent({
  title,
  description,
  type,
  state,
  fundingAmount,
  currencyType,
  numWinners,
  startTime,
  proposalEndTime,
  votingEndTime,
  propStrategyDescription,
  children,
  roundId,
}: RoundContentProps) {
  const isAccepting = state === 'ACCEPTING_PROPOSALS';
  const isVoting = state === 'VOTING';
  const isComplete = state === 'COMPLETED';
  const isCancelled = state === 'CANCELLED';

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        {isCancelled && (
          <div className="bg-brand-red-hint border border-brand-red-semi-transparent rounded-xl px-4 py-3 text-sm font-medium text-brand-red mb-4">
            This round has been cancelled.
          </div>
        )}
        {isComplete && (
          <div className="bg-brand-green-hint border border-brand-green-semi-transparent rounded-xl px-4 py-3 text-sm font-medium text-brand-green mb-4">
            This round is complete. Winners have been selected.
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-xl text-brand-black">
            Proposals <span className="text-brand-gray font-normal text-base">({React.Children.count(children)})</span>
          </h2>
          {isAccepting && (
            <Link href={`/create/proposal?round=${roundId}`}>
              <Button>Submit Proposal</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Proposals */}
      {React.Children.count(children) === 0 ? (
        <div className="text-center py-16 text-brand-gray">
          <p className="text-lg font-medium">No proposals submitted yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">{children}</div>
      )}
    </div>
  );
}
