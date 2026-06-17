import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import StatusPill from '@/components/ui/StatusPill';
import dayjs from 'dayjs';
import type { RoundState } from '@prisma/client';

interface RoundItem {
  id: number;
  title: string;
  type: 'TIMED';
  state: RoundState;
  fundingAmount: number;
  currencyType: string | null;
  numWinners: number;
  startTime: Date;
  proposalEndTime: Date | null;
  votingEndTime: Date | null;
  houseId?: number;
  houseContractAddress?: string;
  proposalCount?: number;
  voteCount?: number;
}

interface RoundListProps {
  rounds: RoundItem[];
  showHouseLink?: boolean;
  emptyMessage?: string;
}

function formatAmount(amount: number, currency: string | null): string {
  if (!currency) return String(amount);
  return `${amount} ${currency}`;
}

function formatCountdown(deadline: Date, now: number): string | null {
  const diff = dayjs(deadline).diff(dayjs(now));
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function CountdownLabel({ round }: { round: RoundItem }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const deadline =
    round.state === 'ACCEPTING_PROPOSALS' ? round.proposalEndTime :
    round.state === 'VOTING' ? round.votingEndTime :
    null;

  if (!deadline) return null;

  const countdown = formatCountdown(deadline, now);

  return (
    <span className="font-bold text-brand-black font-mono text-sm">
      {countdown ?? 'Ended'}
    </span>
  );
}

export default function RoundList({
  rounds,
  showHouseLink = false,
  emptyMessage = 'No rounds found.',
}: RoundListProps) {
  if (rounds.length === 0) {
    return (
      <div className="text-center py-16 text-brand-gray">
        <p className="text-lg font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {rounds.map((round) => (
        <Card
          key={round.id}
          href={showHouseLink && round.houseContractAddress
            ? `/houses/${round.houseContractAddress}`
            : `/rounds/${round.id}`}
          className="p-5"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-brand-black truncate">
                  {round.title}
                </h3>
              </div>
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <StatusPill state={round.state} />
                <CountdownLabel round={round} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-brand-gray">
              <span>
                {formatAmount(round.fundingAmount, round.currencyType)} &times; {round.numWinners}{' '}
                winner{round.numWinners !== 1 ? 's' : ''}
              </span>
              {round.state !== 'ACCEPTING_PROPOSALS' && round.state !== 'VOTING' && (
                <>
                  <span className="hidden sm:inline">&middot;</span>
                  <span>
                    {round.proposalEndTime
                      ? `Ended ${dayjs(round.proposalEndTime).format('MMM D, YYYY')}`
                      : `Started ${dayjs(round.startTime).format('MMM D, YYYY')}`}
                  </span>
                </>
              )}
            </div>

            {(round.proposalCount !== undefined || round.voteCount !== undefined) && (
              <div className="flex items-center gap-4 text-sm pt-1 border-t border-border-light">
                {round.proposalCount !== undefined && (
                  <span>
                    <span className="font-bold text-brand-black">{round.proposalCount}</span>{' '}
                    <span className="text-brand-gray">proposals</span>
                  </span>
                )}
                {round.voteCount !== undefined && (
                  <span>
                    <span className="font-bold text-brand-black">{round.voteCount}</span>{' '}
                    <span className="text-brand-gray">votes</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
