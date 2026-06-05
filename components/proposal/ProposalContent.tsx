interface ProposalContentProps {
  title: string;
  tldr: string;
  content: string;
  address: string;
  createdAt: Date;
  reqAmount?: number | null;
  voteCountFor: number;
  voteCountAgainst: number;
}

export default function ProposalContent({
  title,
  tldr,
  content,
  address,
  createdAt,
  reqAmount,
  voteCountFor,
  voteCountAgainst,
}: ProposalContentProps) {
  const totalVotes = voteCountFor + voteCountAgainst;
  const forPercent = totalVotes > 0 ? (voteCountFor / totalVotes) * 100 : 0;
  const againstPercent = totalVotes > 0 ? (voteCountAgainst / totalVotes) * 100 : 0;

  return (
    <article className="max-w-2xl">
      <h1 className="font-londrina text-3xl text-brand-black mb-2">{title}</h1>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-brand-gray mb-6">
        <span>
          by{' '}
          <span className="font-medium text-brand-black font-mono text-xs">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </span>
        <span>&middot;</span>
        <span>{new Date(createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        {reqAmount && (
          <>
            <span>&middot;</span>
            <span>
              Requested: <span className="font-bold text-brand-black">{String(reqAmount)}</span>
            </span>
          </>
        )}
      </div>

      <p className="text-brand-black font-medium text-lg leading-relaxed mb-6">{tldr}</p>

      <div className="proposalContent border-t border-border-light pt-6" dangerouslySetInnerHTML={{ __html: content }} />

      {totalVotes > 0 && (
        <div className="mt-10 bg-surface-light border border-border-light rounded-2xl p-6 shadow-low">
          <h3 className="font-bold text-lg text-brand-black mb-4">Vote Distribution</h3>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-bold text-brand-green w-16">FOR</span>
            <div className="flex-1 h-3 bg-border-light rounded-full overflow-hidden">
              <div className="h-full bg-brand-green rounded-full transition-all" style={{ width: `${forPercent}%` }} />
            </div>
            <span className="text-sm font-bold text-brand-black w-20 text-right">
              {voteCountFor} ({Math.round(forPercent)}%)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-brand-red w-16">AGAINST</span>
            <div className="flex-1 h-3 bg-border-light rounded-full overflow-hidden">
              <div className="h-full bg-brand-red rounded-full transition-all" style={{ width: `${againstPercent}%` }} />
            </div>
            <span className="text-sm font-bold text-brand-black w-20 text-right">
              {voteCountAgainst} ({Math.round(againstPercent)}%)
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-border-light text-sm text-brand-gray text-center">
            {totalVotes} total vote{totalVotes !== 1 ? 's' : ''} cast
          </div>
        </div>
      )}
    </article>
  );
}
