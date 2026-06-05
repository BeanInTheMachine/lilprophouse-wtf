import dayjs from 'dayjs';

interface ProposalHeaderAndBodyProps {
  title: string;
  tldr: string;
  content: string;
  address: string;
  createdAt: Date;
  reqAmount?: number | null;
}

export default function ProposalHeaderAndBody({
  title,
  tldr,
  content,
  address,
  createdAt,
  reqAmount,
}: ProposalHeaderAndBodyProps) {
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
        <span>{dayjs(createdAt).format('MMMM D, YYYY')}</span>
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
    </article>
  );
}
