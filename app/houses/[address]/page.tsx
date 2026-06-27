'use client';

import { useParams } from 'next/navigation';
import { useHouse } from '@/lib/hooks/useApi';
import RoundList from '@/components/RoundList';
import { deriveRoundState } from '@/lib/roundState';
import Image from 'next/image';
import Link from 'next/link';

export default function HousePage() {
  const params = useParams<{ address: string }>();
  const { data: house, loading, error } = useHouse(params.address);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-pulse space-y-6">
          <div className="w-20 h-20 rounded-full bg-border-light mx-auto" />
          <div className="h-6 w-48 bg-border-light rounded mx-auto" />
          <div className="h-4 w-64 bg-border-light rounded mx-auto" />
        </div>
      </div>
    );
  }

  if (error || !house) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-brand-black mb-2">House not found</h2>
        <p className="text-brand-gray mb-6">{error ?? 'The requested house could not be loaded.'}</p>
        <Link href="/houses" className="text-brand-purple font-bold hover:underline">
          &larr; Back to houses
        </Link>
      </div>
    );
  }

  const rounds = house.rounds ?? [];
  const activeRounds = rounds.filter((r: any) => {
    const s = deriveRoundState(r);
    return s === 'ACCEPTING_PROPOSALS' || s === 'VOTING';
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/houses"
        className="inline-flex items-center text-sm font-medium text-brand-gray hover:text-brand-black mb-6 transition-colors"
      >
        &larr; All houses
      </Link>

      <div className="flex flex-col sm:flex-row items-start gap-5 mb-10">
        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-border-light flex-shrink-0">
          {house.profileImageUrl ? (
            <Image
              src={house.profileImageUrl}
              alt={house.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-brand-purple font-londrina text-2xl">
              {house.name.charAt(0)}
            </div>
          )}
        </div>
        <div>
          <h1 className="font-londrina text-3xl text-brand-black mb-2">{house.name}</h1>
          {house.description && (
            <p className="text-brand-gray leading-relaxed max-w-2xl">{house.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm">
            <span>
              <span className="font-bold text-brand-black">{rounds.length}</span>{' '}
              <span className="text-brand-gray">rounds</span>
            </span>
            {activeRounds.length > 0 && (
              <span>
                <span className="w-2 h-2 inline-block rounded-full bg-brand-green mr-1" />
                <span className="font-bold text-brand-green">{activeRounds.length}</span>{' '}
                <span className="text-brand-gray">active</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <section>
        <h2 className="font-bold text-xl text-brand-black mb-4">Rounds</h2>
        <RoundList
          rounds={rounds.map((r: any) => ({
            id: r.id,
            title: r.title,
            type: r.type,
            state: deriveRoundState(r),
            fundingAmount: Number(r.fundingAmount),
            currencyType: r.currencyType,
            numWinners: r.numWinners,
            startTime: new Date(r.startTime),
            proposalEndTime: r.proposalEndTime ? new Date(r.proposalEndTime) : null,
            votingEndTime: r.votingEndTime ? new Date(r.votingEndTime) : null,
            proposalCount: r.proposals?.length ?? 0,
          }))}
          emptyMessage="No rounds have been created for this house yet."
        />
      </section>
    </div>
  );
}
