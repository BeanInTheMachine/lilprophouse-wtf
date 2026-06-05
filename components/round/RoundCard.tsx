import Card from '@/components/ui/Card';
import StatusPill from '@/components/ui/StatusPill';
import dayjs from 'dayjs';
import type { RoundState } from '@prisma/client';

interface RoundCardProps {
  id: number;
  title: string;
  type: 'TIMED' | 'INFINITE';
  state: RoundState;
  fundingAmount: number;
  currencyType: string | null;
  numWinners: number;
  startTime: Date;
  proposalEndTime: Date | null;
  proposalCount?: number;
  voteCount?: number;
}

export default function RoundCard({
  id,
  title,
  type,
  state,
  fundingAmount,
  currencyType,
  numWinners,
  startTime,
  proposalEndTime,
  proposalCount,
  voteCount,
}: RoundCardProps) {
  return (
    <Card href={`/rounds/${id}`} className="p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base text-brand-black truncate">{title}</h3>
          {type === 'INFINITE' && (
            <span className="text-xs font-medium text-brand-purple bg-brand-purple-hint px-2 py-0.5 rounded-full">
              Continuous
            </span>
          )}
        </div>
        <StatusPill state={state} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-brand-gray">
        <span>
          {fundingAmount} {currencyType ?? ''} &times; {numWinners} winner{numWinners !== 1 ? 's' : ''}
        </span>
        <span className="hidden sm:inline">&middot;</span>
        <span>
          {type === 'TIMED' && proposalEndTime
            ? `Proposals close ${dayjs(proposalEndTime).format('MMM D, YYYY')}`
            : `Started ${dayjs(startTime).format('MMM D, YYYY')}`}
        </span>
      </div>

      {(proposalCount !== undefined || voteCount !== undefined) && (
        <div className="flex items-center gap-4 text-sm pt-1 border-t border-border-light">
          {proposalCount !== undefined && (
            <span>
              <span className="font-bold text-brand-black">{proposalCount}</span>{' '}
              <span className="text-brand-gray">proposals</span>
            </span>
          )}
          {voteCount !== undefined && (
            <span>
              <span className="font-bold text-brand-black">{voteCount}</span>{' '}
              <span className="text-brand-gray">votes</span>
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
