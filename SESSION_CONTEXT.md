# Session Context — 2026-06-25

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
| Contract tests | `test/LilRound.t.sol` |
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

## This Session (2026-06-25): Round Listing Fix + Fund Refunds

Two independent pieces of work. Both implemented, type-checked, and verified. **Committed and pushed** to `origin/main` as commit `31e5936` (`feat: trustless fund refunds + time-derived round listings`).

### Part A — Listings/stats now reflect *time-derived* state; cancelled rounds hidden

**Problem:** The "Completed" tab was always empty and ended rounds stayed under "Active", because the listing queries filtered on the **stored DB `state` enum** — which is never advanced. Nothing ever writes `state = COMPLETED`; only the admin cancel API writes `CANCELLED` (and `visible:false`). Meanwhile the *real* state is time-derived (`lib/roundState.ts` `deriveRoundState()` / `LilRound.currentState()`).

**Files changed:**
- `lib/services/roundService.ts`:
  - `getActiveRounds()` → time-aware: `state notIn [COMPLETED,CANCELLED,NOT_STARTED]` AND (`votingEndTime` null OR `> now`).
  - `getCompletedRounds()` → `state notIn [CANCELLED,NOT_STARTED]` AND (`state=COMPLETED` OR `votingEndTime <= now`). **CANCELLED excluded** (not grouped into completed).
  - `getRoundsForHouse()` → added defensive `state: { not: 'CANCELLED' }`.
  - `getAllRounds()` (admin) **unchanged** — admins still see cancelled.
- `app/app/page.tsx` → RoundList map uses `deriveRoundState(r)` (correct pill + countdown).
- `app/houses/[address]/page.tsx` → active-count filter + RoundList map use `deriveRoundState(r)`.
- `app/api/stats/route.ts` → `usdAwarded` time-aware + excludes CANCELLED; `proposals`/`votes` counts exclude items belonging to cancelled rounds (`round.state != CANCELLED`, and `proposal.round.state != CANCELLED` since `Vote` has no direct `round` relation).

**Key fact:** cancelled rounds are already `visible:false` (set by admin cancel), so every `visible:true` query hides them from all public surfaces; only the admin dashboard shows them.

**Verified:** `/api/rounds?state=active` → 0, `/api/rounds/completed` → 6, `/api/stats` `usdAwarded` 0 → 0.00016.

### Part B — Trustless per-depositor refunds + over-funding sweep (`LilRound.sol`)

**Problem:** Deposited ETH/ERC20/NFTs had **no way out** if a round ended with no submissions/no winners, or was over-funded. `cancel()` only flips a flag; `claim()` requires a winner → funds were permanently locked.

**Design decisions (locked with user):** trustless **per-depositor**; unlock on **both** (cancel/empty **and** leftover excess); claim window = **14-day constant**; for normal completed rounds **only true excess** is refundable — winner award obligations are reserved forever and winners keep claim rights indefinitely.

**Contract changes (`contracts/LilRound.sol`):**
- New storage: `ethDepositOf`, `tokenDepositOf`, `depositedTokens`, `winnerProposalIds`, `winnersAssigned`, `CLAIM_WINDOW = 14 days`, excess-snapshot maps, reentrancy `_locked`.
- `deposit()`/`receive()` credit `ethDepositOf`; `depositToken()` credits `tokenDepositOf` + registers token. ⚠️ Extra SSTORE in `receive()` → plain 2300-gas `.transfer`/`.send` sends now revert; fund via `deposit()`.
- `finalizeRound()` records `winnerProposalIds` + `winnersAssigned`.
- `nonReentrant` modifier added; `claim()` is now `nonReentrant`.
- **Regime A (full exact refund)** when `cancelled || (completed && winnersAssigned==0) || (no proposals && voting ended)`: `refundEth()`, `refundToken(token)`, `refundNft(index)`.
- **Regime B (excess only, after `completedAt + CLAIM_WINDOW`)**: `openExcessRefunds()` snapshots `excess = balance − unclaimed winner obligations` per asset (invariant to claim timing), then `refundExcessEth()` / `refundExcessToken(token)` pay each funder **pro-rata** by deposit share. Unassigned NFTs return to depositor via `refundNft()`.
- New events: `Refunded`, `ExcessRefunded`.

**Tests:** `test/LilRound.t.sol` — self-contained (inline `Vm` cheatcodes + minimal mocks, **no forge-std** so the TS `lib/` dir isn't polluted). **8/8 pass**: cancel ETH refund, empty-ended refund, multi-funder + double-refund revert, refund-not-open revert, ERC20 refund, NFT return, excess-after-window pro-rata (winner still gets award), reentrancy blocked.

**Frontend:**
- `lib/hooks/useOnChain.ts` → `useRefund()` exposing `refundEth/refundToken/refundNft/refundExcessEth/refundExcessToken`; exported from `lib/hooks/index.ts`.
- `app/rounds/[roundId]/manage/page.tsx` → `ReclaimSection` component + "Reclaim Funds" card, gated on on-chain `chainState` (3=Completed / 4=Cancelled). Toggle for full-refund vs excess-only; ETH/token/NFT reclaim buttons. The contract enforces exact eligibility (errors surfaced in UI).

**⚠️ CAVEAT:** Contracts are immutable and deployed per-round. This protects **future** rounds only (new deploys embed the rebuilt bytecode after `forge build`). Already-deployed empty rounds remain permanently locked.

### Build / Test / Run

```bash
forge build          # recompile contracts — via_ir = SLOW (full ~3-5 min). Do NOT use --force.
forge test -vv       # Solidity tests (8 passing)
npx tsc --noEmit     # type-check — SLOW (~3 min, heavy viem ABI inference). Currently: exit 0, 0 errors.
npm run dev          # Next.js (next dev --webpack). Cold route compiles are SLOW (minutes for heavy pages like /rounds/[id]/manage).
```

**Gotchas:**
- `forge build`/`forge test` regenerate `out/*.json`, which `lib/contracts/abis.ts` imports. Don't run forge **while** the dev server is compiling — webpack can hit a transient `ENOENT` on the artifact and cache a failed build. Fix: restart `npm run dev`.
- New contract functions flow to the frontend automatically: `forge build` → updated ABI + bytecode in `out/LilRound.sol/LilRound.json` → `abis.ts` → wizard deploy (`encodeDeployData`). No manual ABI copy.

### Next steps (suggested)
1. ✅ Committed + pushed to `origin/main` (`31e5936`).
2. Deploy a test round on Base and exercise the full reclaim flow end-to-end (cancel→refund, over-fund→excess after window).
3. Consider surfacing per-asset reclaimable amounts in the UI (read `ethDepositOf`/`tokenDepositOf`/`excess*` views) instead of relying on tx-revert for eligibility.
4. Optional: a "Funding progress" bar comparing on-chain balance to award obligations.

---

## Previous Session (2026-06-23): Permanent On-Chain Voting Records

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
