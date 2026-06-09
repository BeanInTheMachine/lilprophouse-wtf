'use client';

import { useAccount } from 'wagmi';
import ConnectToContinue from '@/components/web3/ConnectToContinue';
import { useVotesByAddress, useProposalsByAddress } from '@/lib/hooks/useApi';
import Card from '@/components/ui/Card';
import StatusPill from '@/components/ui/StatusPill';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import Link from 'next/link';
import dayjs from 'dayjs';

function DashboardContent({ address }: { address: string }) {
  const { data: votes, loading: votesLoading } = useVotesByAddress(address);
  const { data: proposals, loading: propsLoading } = useProposalsByAddress(address);

  const loading = votesLoading || propsLoading;

  if (loading) return <LoadingIndicator />;

  return (
    <div className="grid gap-8">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Proposals', value: proposals?.length ?? 0 },
          { label: 'Votes Cast', value: votes?.length ?? 0 },
          { label: 'Total Weight', value: votes?.reduce((s: number, v: any) => s + v.weight, 0) ?? 0 },
          { label: 'Active', value: proposals?.filter((p: any) => p.round?.state === 'ACCEPTING_PROPOSALS' || p.round?.state === 'VOTING').length ?? 0 },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 text-center">
            <p className="font-londrina text-2xl text-brand-purple">{stat.value}</p>
            <p className="text-xs text-brand-gray font-bold uppercase tracking-wider">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* My Proposals */}
      <section>
        <h2 className="font-bold text-xl text-brand-black mb-4">My Proposals</h2>
        {!proposals || proposals.length === 0 ? (
          <p className="text-brand-gray py-8 text-center">No proposals submitted yet.</p>
        ) : (
          <div className="grid gap-4">
            {proposals.map((p: any) => (
              <Link key={p.id} href={`/proposals/${p.id}`}>
                <Card className="p-4 flex items-center justify-between hover:shadow-high transition-shadow">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-brand-black truncate">{p.title}</h3>
                    <p className="text-xs text-brand-gray mt-0.5">{dayjs(p.createdAt).format('MMM D, YYYY')}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className="text-xs text-brand-gray">
                      {p.voteCountFor + p.voteCountAgainst} votes
                    </span>
                    {p.round?.state && <StatusPill state={p.round.state} />}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* My Votes */}
      <section>
        <h2 className="font-bold text-xl text-brand-black mb-4">My Votes</h2>
        {!votes || votes.length === 0 ? (
          <p className="text-brand-gray py-8 text-center">No votes cast yet.</p>
        ) : (
          <div className="grid gap-3">
            {votes.slice(0, 20).map((v: any) => (
              <Link key={v.id} href={`/proposals/${v.proposalId}`}>
                <Card className="p-3 flex items-center gap-3 text-sm">
                  <span className={`font-bold ${v.direction === 'FOR' ? 'text-brand-green' : v.direction === 'AGAINST' ? 'text-brand-red' : 'text-brand-gray'}`}>
                    {v.direction}
                  </span>
                  <span className="text-brand-gray truncate flex-1">{v.proposal?.title ?? `Proposal #${v.proposalId}`}</span>
                  <span className="text-brand-black font-medium">Weight: {v.weight}</span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function DashboardPage() {
  const { address } = useAccount();

  return (
    <ConnectToContinue>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-londrina text-3xl text-brand-black mb-2">Dashboard</h1>
        <p className="text-brand-gray mb-8">Your activity across Lil Rounds.</p>
        {address && <DashboardContent address={address} />}
      </div>
    </ConnectToContinue>
  );
}
