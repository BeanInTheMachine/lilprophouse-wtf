import StatusPill from '@/components/ui/StatusPill';
import dayjs from 'dayjs';
import type { RoundState, RoundType } from '@prisma/client';

interface RoundHeaderProps {
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
}

export default function RoundHeader({
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
}: RoundHeaderProps) {
  const isTimed = type === 'TIMED';

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h1 className="font-londrina text-3xl text-brand-black">{title}</h1>
        <StatusPill state={state} />
      </div>
      {description && <p className="text-brand-gray leading-relaxed max-w-2xl mb-4">{description}</p>}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-brand-gray mb-6">
        <span>
          <span className="font-bold text-brand-black">
            {fundingAmount} {currencyType ?? ''}
          </span>{' '}
          &times; {numWinners} winner{numWinners !== 1 ? 's' : ''}
        </span>
        <span>&middot;</span>
        <span>
          {isTimed
            ? `${dayjs(startTime).format('MMM D, YYYY')} – ${votingEndTime ? dayjs(votingEndTime).format('MMM D, YYYY') : 'Ongoing'}`
            : `Started ${dayjs(startTime).format('MMM D, YYYY')}`}
        </span>
      </div>

      {isTimed && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface-dark rounded-xl p-4 text-center">
            <p className="text-xs text-brand-gray font-bold uppercase tracking-wider mb-1">Proposals</p>
            <p className="font-londrina text-lg text-brand-black">
              {dayjs(startTime).format('MMM D')} – {proposalEndTime ? dayjs(proposalEndTime).format('MMM D, YYYY') : '—'}
            </p>
          </div>
          <div className="bg-surface-dark rounded-xl p-4 text-center">
            <p className="text-xs text-brand-gray font-bold uppercase tracking-wider mb-1">Voting</p>
            <p className="font-londrina text-lg text-brand-black">
              {proposalEndTime ? dayjs(proposalEndTime).format('MMM D') : '—'} –{' '}
              {votingEndTime ? dayjs(votingEndTime).format('MMM D, YYYY') : '—'}
            </p>
          </div>
          <div className="bg-surface-dark rounded-xl p-4 text-center">
            <p className="text-xs text-brand-gray font-bold uppercase tracking-wider mb-1">Strategy</p>
            <p className="font-londrina text-lg text-brand-black">{propStrategyDescription ?? 'Open'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
