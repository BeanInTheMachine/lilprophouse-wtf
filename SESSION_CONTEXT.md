# Session Context — 2026-06-23

## Project: Lil Rounds

Fork of Prop House by Lil Nouns DAO. Communities create "rounds" where builders submit proposals and voters pick winners. Born in and funded by Nouns DAO.

### Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS |
| Web3 | Wagmi 2 + Viem 2 + RainbowKit 2, Base mainnet |
| Data | React Query, EIP-712 signing |
| Backend | Next.js API routes, Prisma ORM, PostgreSQL (Supabase) |
| Contracts | Solidity 0.8.20, Foundry, deployed on Base |
| Optional | Supabase (comments), Pinata (IPFS uploads) |

### Key Files

| Purpose | Path |
|---|---|
| Wagmi config | `lib/wagmi.ts` |
| Providers | `app/providers.tsx` |
| EIP-712 domain (chainId 8453) | `lib/eip712.ts` |
| On-chain hooks | `lib/hooks/useOnChain.ts` |
| API hooks | `lib/hooks/useApi.ts` |
| Mutations | `lib/hooks/useMutations.ts` |
| Smart contract | `contracts/LilRound.sol` |
| House registry | `contracts/HouseRegistry.sol` |
| Foundry config | `foundry.toml` |
| Prisma schema | `prisma/schema.prisma` |
| Round service | `lib/services/roundService.ts` |
| Proposal service | `lib/services/proposalService.ts` |
| Vote service | `lib/services/voteService.ts` |
| Types | `lib/types.ts` |
| Round state logic | `lib/roundState.ts` |
| Merkle tree utils | `lib/merkle.ts` |
| Admin dashboard | `app/admin/page.tsx` |
| Create round wizard | `app/create/round/page.tsx` |
| Create proposal | `app/create/proposal/page.tsx` |
| Round page | `app/rounds/[roundId]/page.tsx` |
| Proposal page | `app/proposals/[proposalId]/page.tsx` |
| Fund/manage page | `app/rounds/[roundId]/manage/page.tsx` |
| Admin API | `app/api/admin/rounds/route.ts` |
| Votes API | `app/api/votes/route.ts` |

### Contracts on Base

| Contract | Address |
|---|---|
| HouseRegistry | `0x5D92a0C0364e4964b7Ab8a3F96724F3b416d7Bfb` |

LilRound is deployed per-round via the create wizard (factory pattern, `encodeDeployData` + `sendTransactionAsync`).

### DB Models (Prisma)

- **House** — name, contractAddress, profileImageUrl, rounds[]
- **Round** — title, fundingAmount, currencyType, numWinners, startTime, proposalEndTime, votingEndTime, state (enum), propStrategy (JSON), voteStrategy (JSON), contractAddress, houseId, proposals[]
- **Proposal** — title, tldr, content, address, voteCountFor, voteCountAgainst, onChainIndex, roundId, votes[]
- **Vote** — direction (FOR/AGAINST/ABSTAIN), weight, address, communityAddress, signature, signedMessage, blockHeight, proposalId, roundId

### Round Lifecycle

```
NOT_STARTED → ACCEPTING_PROPOSALS → VOTING → COMPLETED
                                              → CANCELLED
```

State derived from block.timestamp vs deadlines in `lib/roundState.ts` and `LilRound.currentState()`.

---

## This Session (2026-06-23): Permanent On-Chain Voting Records

**Goal**: Make all voting data permanently referenceable from the blockchain, even if the website disappears.

### Changes Made (commit `d8e2477`)

**1. Smart Contract — `contracts/LilRound.sol`**
- Added `VoteAttested` event: `event VoteAttested(uint256 indexed proposalId, address indexed voter, bytes signature)`
- Added `attestVote(proposalId, signature)` — stores EIP-712 signature on-chain as event log. Requires caller has already voted on that proposal.

**2. Prisma — `prisma/schema.prisma` + migration**
- Added `onChainIndex Int?` to `Proposal` model — bridges DB proposal ID to on-chain array position
- Migration: `prisma/migrations/20260623093338_add_onchain_index_to_proposal/`

**3. On-Chain Hook — `lib/hooks/useOnChain.ts`**
- Added `useAttestVote()` — wraps `writeContractAsync` for `attestVote` on `LilRound`

**4. Proposal Service — `lib/services/proposalService.ts`**
- `CreateProposalInput` now accepts optional `onChainIndex`
- `createProposal()` stores `onChainIndex` on the DB record

**5. Proposal API — `app/api/proposals/route.ts`**
- POST route forwards `onChainIndex` from request body to service

**6. Create Proposal Page — `app/create/proposal/page.tsx`**
- Parses `ProposalSubmitted` event from tx receipt logs using `decodeEventLog`
- Extracts on-chain `proposalId` (array index) and passes it to the DB as `onChainIndex`

**7. Round Page — `app/rounds/[roundId]/page.tsx`**
- Reads on-chain proposals via `useProposalsOnChain()` when `contractAddress` exists
- Derived `getVoteCounts()` prefers on-chain vote counts when `onChainIndex` is available; falls back to DB counts
- Calls `attestVote()` after voting tx + EIP-712 signing (best-effort)
- Extracted `ProposalCard` component (fixed Rules of Hooks violation where `useHasVotedOn` was inside `.map()`)

**8. Proposal Page — `app/proposals/[proposalId]/page.tsx`**
- Reads on-chain proposal via `useProposalOnChain()` when `round.contractAddress` and `proposal.onChainIndex` exist
- Displays on-chain vote counts when available, DB counts as fallback
- Calls `attestVote()` after voting

### How It Works End-to-End

```
User votes:
  1. vote() on-chain (LilRound) → existing flow, stores votesFor/votesAgainst
  2. Wait for tx receipt
  3. Sign EIP-712 typed data (direction, proposalId, weight, communityAddress, blockHeight)
  4. POST /api/votes → DB store (existing)
  5. attestVote() on-chain → VoteAttested event permanently stores signature (NEW)

User creates proposal:
  1. propose() on-chain (LilRound) → emits ProposalSubmitted with on-chain index
  2. Wait for tx receipt
  3. Parse ProposalSubmitted from receipt logs → get onChainIndex
  4. POST /api/proposals → DB store with onChainIndex (NEW)

Viewing votes:
  1. Fetch on-chain proposals via getAllProposals() / getProposal()
  2. Match DB proposals to on-chain proposals by onChainIndex
  3. Display on-chain vote counts (chain is authoritative)
```

### Env Vars

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<set>
NEXT_PUBLIC_BASE_RPC_URL=<Infura Base>
NEXT_PUBLIC_RPC_URL=<Infura mainnet — for ENS>
NEXT_PUBLIC_ADMIN_ADDRESSES=0xB875BADbd67c7D5fa2C845ddCE8FE112Fe383309
NEXT_PUBLIC_HOUSE_REGISTRY_ADDRESS=0x5D92a0C0364e4964b7Ab8a3F96724F3b416d7Bfb
```

### Run Dev Server

```bash
npm run dev    # http://localhost:3000
```
