export type RoundState = 'ACCEPTING_PROPOSALS' | 'VOTING' | 'COMPLETED' | 'CANCELLED' | 'NOT_STARTED';

interface RoundTimeline {
  state: string;
  proposalEndTime: Date | string | null;
  votingEndTime: Date | string | null;
}

export function deriveRoundState(round: RoundTimeline): RoundState {
  if (round.state === 'CANCELLED') return 'CANCELLED';
  if (round.state === 'COMPLETED') return 'COMPLETED';
  if (round.state === 'NOT_STARTED') return 'NOT_STARTED';

  const now = Date.now();
  const proposalEnd = round.proposalEndTime ? new Date(round.proposalEndTime).getTime() : 0;
  const votingEnd = round.votingEndTime ? new Date(round.votingEndTime).getTime() : 0;

  if (proposalEnd <= 0) return 'ACCEPTING_PROPOSALS';
  if (now < proposalEnd) return 'ACCEPTING_PROPOSALS';
  if (votingEnd > 0 && now < votingEnd) return 'VOTING';
  if (proposalEnd > 0 && now >= proposalEnd && votingEnd <= 0) return 'VOTING';

  return 'COMPLETED';
}
