'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useProposal, useRound } from '@/lib/hooks/useApi';
import { useVoteOnChain, useVoteWithProofOnChain, useHasVotedOn, useAttestVote, useProposalOnChain } from '@/lib/hooks/useOnChain';
import { useSubmitVotes } from '@/lib/hooks/useMutations';
import { buildMerkleTree, generateMerkleProof } from '@/lib/merkle';
import { useSignTypedData, useWaitForTransactionReceipt } from 'wagmi';
import { DOMAIN_SEPARATOR, VOTE_MESSAGE_TYPES } from '@/lib/eip712';
import { deriveRoundState } from '@/lib/roundState';
import Link from 'next/link';
import dayjs from 'dayjs';

export default function ProposalPage() {
  const params = useParams<{ proposalId: string }>();
  const proposalId = parseInt(params.proposalId, 10);
  const { data: proposal, loading, error } = useProposal(proposalId);
  const { data: round } = useRound(proposal?.roundId);
  const { address: wallet } = useAccount();
  const { vote, isPending: voting } = useVoteOnChain();
  const { voteWithProof } = useVoteWithProofOnChain();
  const { submitVotes } = useSubmitVotes();
  const { attestVote } = useAttestVote();
  const { proposal: onChainProposal } = useProposalOnChain(
    round?.contractAddress ?? undefined,
    proposal?.onChainIndex ?? undefined,
  );
  const { signTypedDataAsync } = useSignTypedData();
  const [votingStatus, setVotingStatus] = useState<'for' | 'against' | 'abstain' | null>(null);
  const [voteTxHash, setVoteTxHash] = useState<`0x${string}` | null>(null);
  const { data: voteReceipt } = useWaitForTransactionReceipt({ hash: voteTxHash ?? undefined });
  const { hasVoted } = useHasVotedOn(
    round?.contractAddress ?? undefined,
    proposalId,
    wallet ?? undefined,
  );

  const effectiveState = round ? deriveRoundState(round) : null;
  const isVoting = effectiveState === 'VOTING';

  useEffect(() => {
    if (!voteReceipt || !round || !wallet || !votingStatus) return;
    const blockHeight = Number(voteReceipt.blockNumber);
    const msg = {
      direction: votingStatus === 'for' ? 0 : votingStatus === 'against' ? 1 : 2,
      proposalId,
      weight: 1,
      communityAddress: round.contractAddress ?? '0x0000000000000000000000000000000000000000',
      blockHeight,
    };
    (async () => {
      try {
        const signedMessageString = JSON.stringify(msg);
        const signature = await signTypedDataAsync({
          domain: DOMAIN_SEPARATOR,
          types: VOTE_MESSAGE_TYPES,
          primaryType: 'Vote',
          message: msg,
        });
        await submitVotes([{
          direction: votingStatus.toUpperCase() as 'FOR' | 'AGAINST' | 'ABSTAIN',
          weight: 1,
          address: wallet,
          proposalId,
          roundId: round.id,
          communityAddress: msg.communityAddress,
          signature,
          signedMessage: Buffer.from(signedMessageString).toString('base64'),
        }]);
        if (round.contractAddress) {
          try { await attestVote(round.contractAddress, proposalId, signature); } catch { /* best-effort */ }
        }
      } catch {
        // DB sync is best-effort
      }
      setVotingStatus(null);
      setVoteTxHash(null);
    })();
  }, [voteReceipt]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-border-light rounded" />
          <div className="h-4 w-32 bg-border-light rounded" />
          <div className="h-64 bg-border-light rounded-2xl mt-8" />
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-brand-black mb-2">Proposal not found</h2>
        <p className="text-brand-gray mb-6">{error ?? 'The requested proposal could not be loaded.'}</p>
        <Link href="/app" className="text-brand-purple font-bold hover:underline">
          &larr; Browse rounds
        </Link>
      </div>
    );
  }

  const chainVotesFor = onChainProposal ? Number(onChainProposal.votesFor ?? 0) : null;
  const chainVotesAgainst = onChainProposal ? Number(onChainProposal.votesAgainst ?? 0) : null;
  const displayVotesFor = chainVotesFor ?? proposal.voteCountFor;
  const displayVotesAgainst = chainVotesAgainst ?? proposal.voteCountAgainst;
  const totalVotes = displayVotesFor + displayVotesAgainst;
  const forPercent = totalVotes > 0 ? (displayVotesFor / totalVotes) * 100 : 0;
  const againstPercent = totalVotes > 0 ? (displayVotesAgainst / totalVotes) * 100 : 0;

  async function handleVote(direction: 'for' | 'against' | 'abstain') {
    if (!round?.contractAddress || !wallet) return;
    setVotingStatus(direction);
    try {
      const isFor = direction === 'for';

      const vs = round.voteStrategy as any;
      const voters = vs?.voters ?? [];
      const isAllowlist = voters.some((v: any) => v.strategyType === 'ALLOWLIST');

      let hash: `0x${string}`;
      if (isAllowlist) {
        const allowlistVoter = voters.find((v: any) => v.strategyType === 'ALLOWLIST');
        const members = allowlistVoter?.members ?? [];
        const tree = buildMerkleTree(members.map((m: any) => ({ address: m.address, weight: m.govPower })));
        const proof = generateMerkleProof(tree, wallet);
        const memberEntry = members.find((m: any) => m.address.toLowerCase() === wallet.toLowerCase());
        if (!proof || !memberEntry) {
          throw new Error('Not on allowlist');
        }
        hash = await voteWithProof(round.contractAddress, proposal.id, isFor, Number(memberEntry.govPower), proof);
      } else {
        hash = await vote(round.contractAddress, proposal.id, isFor);
      }
      setVoteTxHash(hash);
    } catch {
      setVotingStatus(null);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href={proposal.roundId ? `/rounds/${proposal.roundId}` : '/app'}
        className="inline-flex items-center text-sm font-medium text-brand-gray hover:text-brand-black mb-6 transition-colors"
      >
        &larr; Back to round
      </Link>

      <article className="max-w-2xl">
        <h1 className="font-londrina text-3xl text-brand-black mb-2">{proposal.title}</h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-brand-gray mb-6">
          <span>
            by{' '}
            <span className="font-medium text-brand-black font-mono text-xs">
              {proposal.address.slice(0, 6)}...{proposal.address.slice(-4)}
            </span>
          </span>
          <span>&middot;</span>
          <span>{dayjs(proposal.createdAt).format('MMMM D, YYYY')}</span>
          {proposal.reqAmount && (
            <>
              <span>&middot;</span>
              <span>Requested: <span className="font-bold text-brand-black">{String(proposal.reqAmount)}</span></span>
            </>
          )}
        </div>

        <p className="text-brand-black font-medium text-lg leading-relaxed mb-6">
          {proposal.tldr}
        </p>

        <div
          className="proposalContent border-t border-border-light pt-6"
          dangerouslySetInnerHTML={{ __html: proposal.content }}
        />
      </article>

      {/* Voting buttons */}
      {isVoting && round?.contractAddress && wallet && (
        <div className="max-w-2xl mt-8">
          <h3 className="font-bold text-lg text-brand-black mb-3">Cast Your Vote</h3>
          {hasVoted ? (
            <p className="text-sm font-bold text-brand-purple py-2">You have already voted on this proposal.</p>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => handleVote('for')}
                disabled={votingStatus !== null}
                className="flex-1 px-4 py-2.5 rounded-[10px] text-sm font-bold text-white bg-brand-green hover:opacity-90 transition-colors disabled:opacity-50"
              >
                {votingStatus === 'for' ? 'Voting...' : 'Vote For'}
              </button>
              <button
                onClick={() => handleVote('against')}
                disabled={votingStatus !== null}
                className="flex-1 px-4 py-2.5 rounded-[10px] text-sm font-bold text-white bg-brand-red hover:opacity-90 transition-colors disabled:opacity-50"
              >
                {votingStatus === 'against' ? 'Voting...' : 'Vote Against'}
              </button>
              <button
                onClick={() => handleVote('abstain')}
                disabled={votingStatus !== null}
                className="px-4 py-2.5 rounded-[10px] text-sm font-bold text-brand-gray bg-surface-dark hover:bg-border-light transition-colors disabled:opacity-50"
              >
                {votingStatus === 'abstain' ? '...' : 'Abstain'}
              </button>
            </div>
          )}
        </div>
      )}

      {totalVotes > 0 && (
        <div className="max-w-2xl mt-10 bg-surface-light border border-border-light rounded-2xl p-6 shadow-low">
          <h3 className="font-bold text-lg text-brand-black mb-4">Vote Distribution</h3>

          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-bold text-brand-green w-16">FOR</span>
            <div className="flex-1 h-3 bg-border-light rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-green rounded-full transition-all"
                style={{ width: `${forPercent}%` }}
              />
            </div>
            <span className="text-sm font-bold text-brand-black w-20 text-right">
              {displayVotesFor} ({Math.round(forPercent)}%)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-brand-red w-16">AGAINST</span>
            <div className="flex-1 h-3 bg-border-light rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-red rounded-full transition-all"
                style={{ width: `${againstPercent}%` }}
              />
            </div>
            <span className="text-sm font-bold text-brand-black w-20 text-right">
              {displayVotesAgainst} ({Math.round(againstPercent)}%)
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-border-light text-sm text-brand-gray text-center">
            {totalVotes} total vote{totalVotes !== 1 ? 's' : ''} cast
          </div>
        </div>
      )}
    </div>
  );
}
