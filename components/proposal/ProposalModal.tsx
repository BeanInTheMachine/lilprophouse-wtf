'use client';

import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Link from 'next/link';

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: {
    id: number;
    title: string;
    tldr: string;
    content: string;
    address: string;
    createdAt: Date;
    reqAmount?: number | null;
    voteCountFor: number;
    voteCountAgainst: number;
  };
  onVote?: (direction: 'FOR' | 'AGAINST') => void;
}

export default function ProposalModal({ isOpen, onClose, proposal, onVote }: ProposalModalProps) {
  const totalVotes = proposal.voteCountFor + proposal.voteCountAgainst;
  const forPercent = totalVotes > 0 ? (proposal.voteCountFor / totalVotes) * 100 : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="font-londrina text-2xl text-brand-black mb-3">{proposal.title}</h2>
        <p className="text-brand-gray text-sm mb-4">
          by{' '}
          <span className="font-mono text-xs">
            {proposal.address.slice(0, 6)}...{proposal.address.slice(-4)}
          </span>
        </p>
        <p className="text-brand-black mb-4">{proposal.tldr}</p>

        <div className="proposalContent text-sm mb-6" dangerouslySetInnerHTML={{ __html: proposal.content }} />

        {totalVotes > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-2 bg-border-light rounded-full overflow-hidden">
                <div className="h-full bg-brand-green rounded-full" style={{ width: `${forPercent}%` }} />
              </div>
              <span className="text-xs text-brand-gray">{Math.round(forPercent)}%</span>
            </div>
            <div className="flex justify-between text-xs text-brand-gray">
              <span>{proposal.voteCountFor} for</span>
              <span>{proposal.voteCountAgainst} against</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-light">
          <Link href={`/proposals/${proposal.id}`} onClick={onClose} className="text-sm font-bold text-brand-purple hover:underline">
            View full proposal
          </Link>
          {onVote && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onVote('FOR')}>
                Vote For
              </Button>
              <Button variant="ghost" onClick={() => onVote('AGAINST')}>
                Against
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
