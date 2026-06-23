'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount, useEnsName, useSignTypedData, useWaitForTransactionReceipt } from 'wagmi';
import { useRound } from '@/lib/hooks/useApi';
import { useRoundChainState, useVoteOnChain, useVoteWithProofOnChain, useHasVotedOn, useDepositorsOnChain } from '@/lib/hooks/useOnChain';
import { useSubmitVotes } from '@/lib/hooks/useMutations';
import { buildMerkleTree, generateMerkleProof } from '@/lib/merkle';
import { DOMAIN_SEPARATOR, VOTE_MESSAGE_TYPES } from '@/lib/eip712';
import { deriveRoundState } from '@/lib/roundState';
import RewardsDisplay from '@/components/round/RewardsDisplay';
import Link from 'next/link';
import dayjs from 'dayjs';

const STATE_BANNERS: Record<string, { title: string; message: string; variant: 'info' | 'success' | 'warning' }> = {
  NOT_STARTED: {
    title: 'Waiting for round to start',
    message: 'This round has been created and will begin accepting proposals on the start date.',
    variant: 'warning',
  },
  ACCEPTING_PROPOSALS: {
    title: 'Accepting proposals',
    message: 'This round is open for proposals. Submit your ideas before the deadline.',
    variant: 'success',
  },
  VOTING: {
    title: 'Voting is open',
    message: 'Proposal submissions are closed. Cast your votes before the voting period ends.',
    variant: 'info',
  },
  COMPLETED: {
    title: 'Round closed',
    message: 'This round has ended. Winners have been selected.',
    variant: 'warning',
  },
  CANCELLED: {
    title: 'Round cancelled',
    message: 'This round has been cancelled and is no longer accepting proposals or votes.',
    variant: 'warning',
  },
};

const BANNER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  success: { bg: 'bg-white', border: 'border-brand-green-semi-transparent', text: 'text-brand-green' },
  info: { bg: 'bg-brand-purple-hint', border: 'border-brand-purple-semi-transparent', text: 'text-brand-purple' },
  warning: { bg: 'bg-brand-yellow-hint', border: 'border-brand-yellow-semi-transparent', text: 'text-brand-yellow' },
};

function FunderAddress({ address }: { address: string }) {
  const { data: ens } = useEnsName({ address: address as `0x${string}`, chainId: 1 });
  return (
    <p className="font-bold text-sm text-brand-black">
      {ens ?? `${address.slice(0, 6)}...${address.slice(-4)}`}
    </p>
  );
}

export default function RoundPage() {
  const params = useParams<{ roundId: string }>();
  const roundId = parseInt(params.roundId, 10);
  const { data: round, loading, error } = useRound(roundId);
  const { address: wallet } = useAccount();
  const chainAddress = (round?.contractAddress as `0x${string}` | undefined) ?? '0x0000000000000000000000000000000000000000';
  const { state: chainState, owner: chainOwner, totalDeposited } = useRoundChainState(chainAddress);
  const { vote, isPending: voting } = useVoteOnChain();
  const { voteWithProof } = useVoteWithProofOnChain();
  const { submitVotes } = useSubmitVotes();
  const { signTypedDataAsync } = useSignTypedData();
  const { depositors } = useDepositorsOnChain(round?.contractAddress ?? undefined);
  const [votingPropId, setVotingPropId] = useState<number | null>(null);
  const [votingDirection, setVotingDirection] = useState<'for' | 'against' | 'abstain' | null>(null);
  const [voteTxHash, setVoteTxHash] = useState<`0x${string}` | null>(null);
  const { data: voteReceipt } = useWaitForTransactionReceipt({ hash: voteTxHash ?? undefined });

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!voteReceipt || !round || !wallet || votingPropId === null || !votingDirection) return;
    const blockHeight = Number(voteReceipt.blockNumber);
    const msg = {
      direction: votingDirection === 'for' ? 0 : votingDirection === 'against' ? 1 : 2,
      proposalId: votingPropId,
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
          direction: votingDirection.toUpperCase() as 'FOR' | 'AGAINST' | 'ABSTAIN',
          weight: 1,
          address: wallet,
          proposalId: votingPropId,
          roundId: round.id,
          communityAddress: msg.communityAddress,
          signature,
          signedMessage: Buffer.from(signedMessageString).toString('base64'),
        }]);
      } catch {
        // DB sync is best-effort; on-chain vote already succeeded
      }
      setVotingPropId(null);
      setVotingDirection(null);
      setVoteTxHash(null);
    })();
  }, [voteReceipt]);

  function formatCountdown(deadline: Date): string | null {
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

  function getStrategyDescription(): string {
    if (!round?.voteStrategy) return '';
    const vs = round.voteStrategy as any;
    const voters = vs.voters ?? [];
    if (voters.length === 0) return 'Open voting (1 vote per address)';
    const allMembers: { address: string; govPower: string }[] = [];
    for (const v of voters) {
      if (v.strategyType === 'ALLOWLIST' && v.members) {
        allMembers.push(...v.members);
      } else if (v.address) {
        allMembers.push({ address: v.address, govPower: String(v.multiplier ?? 1) });
      }
    }
    if (allMembers.length > 1) return `Allowlist — ${allMembers.length} voters`;
    if (allMembers.length === 1) return `Allowlist — 1 voter`;
    if (voters[0]?.strategyType?.includes('ERC')) {
      return `Token holders of ${voters[0].address?.slice(0, 6)}...${voters[0].address?.slice(-4)} ×${voters[0].multiplier ?? 1}`;
    }
    return 'Open voting (1 vote per address)';
  }

  async function handleVoteOnProposal(proposal: any, direction: 'for' | 'against' | 'abstain') {
    if (!round?.contractAddress || !wallet) return;
    setVotingPropId(proposal.id);
    setVotingDirection(direction);
    try {
      const isFor = direction === 'for';

      const vs = round.voteStrategy as any;
      const voters = vs?.voters ?? [];
      const isAllowlist = voters.some((v: any) => v.strategyType === 'ALLOWLIST');

      if (isAllowlist) {
        const allowlistVoter = voters.find((v: any) => v.strategyType === 'ALLOWLIST');
        const members = allowlistVoter?.members ?? [];
        const tree = buildMerkleTree(members.map((m: any) => ({ address: m.address, weight: m.govPower })));
        const proof = generateMerkleProof(tree, wallet);
        const memberEntry = members.find((m: any) => m.address.toLowerCase() === wallet.toLowerCase());
        if (!proof || !memberEntry) {
          throw new Error('Not on allowlist');
        }
        const hash = await voteWithProof(round.contractAddress, proposal.id, isFor, Number(memberEntry.govPower), proof);
        setVoteTxHash(hash);
      } else {
        const hash = await vote(round.contractAddress, proposal.id, isFor);
        setVoteTxHash(hash);
      }
    } catch {
      setVotingPropId(null);
      setVotingDirection(null);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-border-light rounded" />
          <div className="h-4 w-96 bg-border-light rounded" />
          <div className="grid gap-4 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-border-light rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !round) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-brand-black mb-2">Round not found</h2>
        <p className="text-brand-gray mb-6">{error ?? 'The requested round could not be loaded.'}</p>
        <Link href="/app" className="text-brand-purple font-bold hover:underline">
          &larr; Browse rounds
        </Link>
      </div>
    );
  }

  const effectiveState = round ? deriveRoundState(round) : 'NOT_STARTED';
  const banner = STATE_BANNERS[effectiveState] ?? STATE_BANNERS.NOT_STARTED;
  const colors = BANNER_COLORS[banner.variant];
  const proposals = round.proposals ?? [];
  const isAccepting = effectiveState === 'ACCEPTING_PROPOSALS';

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/app"
        className="inline-flex items-center text-sm font-medium text-brand-gray hover:text-brand-black mb-6 transition-colors"
      >
        &larr; Browse rounds
      </Link>

      {/* State Banner */}
      <div className={`${colors.bg} ${colors.border} border rounded-2xl px-5 py-4 mb-8`}>
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${colors.text.replace('text-', 'bg-')}`} />
          <h2 className={`font-bold text-base ${colors.text}`}>{banner.title}</h2>
          {(effectiveState === 'ACCEPTING_PROPOSALS' || effectiveState === 'VOTING') && (
            'proposalEndTime' in round && 'votingEndTime' in round && (
              <span className="ml-auto font-mono text-sm font-bold text-brand-black">
                {formatCountdown(
                  effectiveState === 'ACCEPTING_PROPOSALS'
                    ? round.proposalEndTime!
                    : round.votingEndTime!
                ) ?? 'Ended'}
              </span>
            )
          )}
        </div>
        <p className="text-sm text-brand-gray mt-1 ml-5.5">{banner.message}</p>
      </div>

      {getStrategyDescription() && (
        <div className="bg-surface-dark border border-border-light rounded-xl px-4 py-3 mb-8 text-sm text-brand-gray">
          <span className="font-bold text-brand-black">Who can vote:</span> {getStrategyDescription()}
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <h1 className="font-londrina text-3xl text-brand-black">{round.title}</h1>
          <Link
            href={`/rounds/${roundId}/manage`}
            className="ml-auto inline-flex items-center justify-center rounded-[10px] px-3 py-1.5 text-sm font-bold text-brand-purple border border-brand-purple hover:bg-brand-purple-hint transition-colors"
          >
            Fund This Round
          </Link>
        </div>

        {round.description && (
          <p className="text-brand-gray leading-relaxed max-w-2xl mb-4">{round.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-brand-gray">
          <span>
            <span className="font-bold text-brand-black">
              {Number(round.fundingAmount)} {round.currencyType ?? ''}
            </span>{' '}
            &times; {round.numWinners} winner{round.numWinners !== 1 ? 's' : ''}
          </span>
          <span>&middot;</span>
          <span>
            {dayjs(round.startTime).format('MMM D, YYYY')} &ndash;{' '}
            {round.votingEndTime ? dayjs(round.votingEndTime).format('MMM D, YYYY') : 'Ongoing'}
          </span>
        </div>

        {round.contractAddress && totalDeposited !== undefined && Number(round.fundingAmount) > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-bold text-brand-black">Funding Progress</span>
              <span className="text-brand-gray">
                {Number(totalDeposited) / 1e18} / {Number(round.fundingAmount)} {round.currencyType ?? 'ETH'}
              </span>
            </div>
            <div className="w-full h-3 bg-border-light rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-green rounded-full transition-all duration-500"
                style={{ width: `${Math.min((Number(totalDeposited) / 1e18 / Number(round.fundingAmount)) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-dark rounded-xl p-4 text-center">
          <p className="text-xs text-brand-gray font-bold uppercase tracking-wider mb-1">Proposals</p>
          <p className="font-londrina text-lg text-brand-black">
            {dayjs(round.startTime).format('MMM D')} &ndash;{' '}
            {round.proposalEndTime ? dayjs(round.proposalEndTime).format('MMM D, YYYY') : '—'}
          </p>
        </div>
        <div className="bg-surface-dark rounded-xl p-4 text-center">
          <p className="text-xs text-brand-gray font-bold uppercase tracking-wider mb-1">Voting</p>
          <p className="font-londrina text-lg text-brand-black">
            {round.proposalEndTime ? dayjs(round.proposalEndTime).format('MMM D') : '—'} &ndash;{' '}
            {round.votingEndTime ? dayjs(round.votingEndTime).format('MMM D, YYYY') : '—'}
          </p>
        </div>
        <div className="bg-surface-dark rounded-xl p-4 text-center">
          <p className="text-xs text-brand-gray font-bold uppercase tracking-wider mb-1">Funded By</p>
          {depositors.length > 0 ? (
            <div className="flex flex-col gap-0.5 items-center">
              {depositors.slice(0, 5).map((d) => (
                <FunderAddress key={d} address={d} />
              ))}
              {depositors.length > 5 && (
                <p className="text-xs text-brand-gray">+{depositors.length - 5} more</p>
              )}
            </div>
          ) : (
            <p className="font-londrina text-lg text-brand-black">
              {round.contractAddress ? 'None yet' : '—'}
            </p>
          )}
        </div>
      </div>

      {round.contractAddress && (
        <RewardsDisplay roundAddress={round.contractAddress} />
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-xl text-brand-black">
            Proposals{' '}
            <span className="text-brand-gray font-normal text-base">({proposals.length})</span>
          </h2>
          {isAccepting && (
            <Link
              href={`/create/proposal?round=${round.id}${round.contractAddress ? `&address=${round.contractAddress}` : ''}`}
              className="inline-flex items-center justify-center rounded-[10px] px-3 py-1.5 text-sm font-bold text-white bg-brand-purple hover:bg-brand-purple-transparent transition-colors no-underline"
            >
              Submit proposal
            </Link>
          )}
        </div>

        {proposals.length === 0 ? (
          <div className="text-center py-16 text-brand-gray">
            <p className="text-lg font-medium">
              {isAccepting
                ? 'No proposals submitted yet. Be the first!'
                : round.state === 'NOT_STARTED'
                ? 'Proposals will open once the round starts.'
                : 'No proposals were submitted for this round.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {proposals.map((proposal: any) => {
              const totalVotes = proposal.voteCountFor + proposal.voteCountAgainst;
              const forPercent = totalVotes > 0 ? (proposal.voteCountFor / totalVotes) * 100 : 0;
              const isVoting = effectiveState === 'VOTING';
              const { hasVoted } = useHasVotedOn(
                round?.contractAddress ?? undefined,
                proposal.id,
                wallet ?? undefined,
              );

              return (
                <div
                  key={proposal.id}
                  className="bg-surface-light border border-border-light rounded-2xl p-5 shadow-low hover:shadow-high transition-all duration-150 ease-out"
                >
                  <Link href={`/proposals/${proposal.id}`} className="block no-underline">
                    <h3 className="font-bold text-base text-brand-black mb-1">{proposal.title}</h3>
                    <p className="text-sm text-brand-gray line-clamp-2 mb-3">{proposal.tldr}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-brand-gray">
                        by <span className="font-medium text-brand-black font-mono text-xs">{proposal.address.slice(0, 6)}...{proposal.address.slice(-4)}</span>
                      </span>
                      {totalVotes > 0 && (
                        <>
                          <span className="text-brand-gray">&middot;</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-border-light rounded-full overflow-hidden">
                              <div className="h-full bg-brand-purple rounded-full" style={{ width: `${forPercent}%` }} />
                            </div>
                            <span className="text-xs text-brand-gray">
                              {proposal.voteCountFor} / {totalVotes}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </Link>
                  {isVoting && round.contractAddress && wallet && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-border-light">
                      {hasVoted ? (
                        <span className="text-sm font-bold text-brand-purple py-1.5">Voted</span>
                      ) : (
                        <>
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              await handleVoteOnProposal(proposal, 'for');
                            }}
                            disabled={votingPropId !== null}
                            className="flex-1 px-3 py-1.5 rounded-[10px] text-sm font-bold text-white bg-brand-green hover:opacity-90 transition-colors disabled:opacity-50"
                          >
                            {votingPropId === proposal.id && votingDirection === 'for' ? 'Voting...' : 'Vote For'}
                          </button>
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              await handleVoteOnProposal(proposal, 'against');
                            }}
                            disabled={votingPropId !== null}
                            className="flex-1 px-3 py-1.5 rounded-[10px] text-sm font-bold text-white bg-brand-red hover:opacity-90 transition-colors disabled:opacity-50"
                          >
                            {votingPropId === proposal.id && votingDirection === 'against' ? 'Voting...' : 'Vote Against'}
                          </button>
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              await handleVoteOnProposal(proposal, 'abstain');
                            }}
                            disabled={votingPropId !== null}
                            className="px-3 py-1.5 rounded-[10px] text-sm font-bold text-brand-gray bg-surface-dark hover:bg-border-light transition-colors disabled:opacity-50"
                          >
                            {votingPropId === proposal.id && votingDirection === 'abstain' ? '...' : 'Abstain'}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
