import type { RoundType, RoundState, Direction } from '@prisma/client';

export type { RoundType, RoundState, Direction };

export interface HouseWithRounds {
  id: number;
  visible: boolean;
  contractAddress: string;
  name: string;
  profileImageUrl: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  rounds: RoundWithProposals[];
}

export interface RoundWithProposals {
  id: number;
  visible: boolean;
  type: RoundType;
  title: string;
  description: string | null;
  fundingAmount: number;
  currencyType: string | null;
  numWinners: number;
  startTime: Date;
  proposalEndTime: Date | null;
  votingEndTime: Date | null;
  balanceBlockTag: number;
  propStrategy: any;
  voteStrategy: any;
  propStrategyDescription: string | null;
  voteStrategyDescription: string | null;
  displayComments: boolean;
  quorumFor: number | null;
  quorumAgainst: number | null;
  votingPeriod: number | null;
  state: RoundState;
  houseId: number;
  createdAt: Date;
  updatedAt: Date;
  proposals: ProposalWithVotes[];
}

export interface ProposalWithVotes {
  id: number;
  title: string;
  content: string;
  tldr: string;
  address: string;
  reqAmount: number | null;
  voteCountFor: number;
  voteCountAgainst: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roundId: number;
  votes: VoteInfo[];
}

export interface VoteInfo {
  id: number;
  direction: Direction;
  weight: number;
  address: string;
  blockHeight: number;
  createdAt: Date;
  proposalId: number;
  roundId: number;
}

export interface PlatformStats {
  totalHouses: number;
  totalRounds: number;
  totalProposals: number;
  totalVotes: number;
  totalEthFunded: number;
}
