import Link from 'next/link';

interface ProposalCardProps {
  id: number;
  title: string;
  tldr: string;
  address: string;
  voteCountFor: number;
  voteCountAgainst: number;
  createdAt: Date;
  roundId?: number;
}

export default function ProposalCard({
  id,
  title,
  tldr,
  address,
  voteCountFor,
  voteCountAgainst,
  roundId,
}: ProposalCardProps) {
  const totalVotes = voteCountFor + voteCountAgainst;
  const forPercent = totalVotes > 0 ? (voteCountFor / totalVotes) * 100 : 0;

  return (
    <Link
      href={`/proposals/${id}`}
      className="block bg-surface-light border border-border-light rounded-2xl p-5 shadow-low hover:shadow-high transition-all duration-150 ease-out"
    >
      <h3 className="font-bold text-base text-brand-black mb-1">{title}</h3>
      <p className="text-sm text-brand-gray line-clamp-2 mb-3">{tldr}</p>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-brand-gray">
          by{' '}
          <span className="font-medium text-brand-black font-mono text-xs">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </span>
        {totalVotes > 0 && (
          <>
            <span className="text-brand-gray">&middot;</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-border-light rounded-full overflow-hidden">
                <div className="h-full bg-brand-purple rounded-full" style={{ width: `${forPercent}%` }} />
              </div>
              <span className="text-xs text-brand-gray">
                {voteCountFor} / {totalVotes}
              </span>
            </div>
          </>
        )}
      </div>
    </Link>
  );
}
