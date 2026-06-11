# Lil Rounds — Session Context

## What This Is
A full rebuild of the Nouns Prop House platform into a unified Next.js 16 App Router application. Branded as "Lil Rounds" for the Lil Nouns community. Lives at `lilprophouse.wtf` (GitHub: `BeanInTheMachine/lilprophouse-wtf`).

## Tech Stack
- **Frontend:** Next.js 16 (webpack mode), React 19, TypeScript, Tailwind CSS
- **State:** React hooks + wagmi v2. No Redux. No i18n.
- **Web3:** wagmi v2 + viem + RainbowKit on Base L2 (chainId 8453)
- **Database:** PostgreSQL via Supabase, Prisma ORM (connected and seeded)
- **Contracts:** Custom Solidity contracts (HouseRegistry + LilRound), deployed to Base mainnet
- **Files:** IPFS via Pinata; Replies via Supabase
- **Fonts:** PT Root UI (Bold/Medium/Regular/Light .woff2 in `public/fonts/`)

## Current State

### Fully Built
- All 9 original rebuild phases complete (schema → theme → components → pages → hooks → API → Web3 → Supabase → OG/SEO)
- Full 6-step create round wizard with house selection, round info, voters, awards, dates, review (TIMED rounds only — INFINITE removed)
- Wallet-gated create round flow
- EIP-712 signature verification
- All UI components (36 components in `components/`)
- Smart contract integration on Base L2

### Smart Contracts (Base L2)
- **Deployed:** `HouseRegistry` at `0x3b970E7F0Eb569c043B27C52A8259F1DaE99D539` (Base mainnet)
- **Compiled (not deployed separately):** `LilRound` — deployed per-round via the wizard
- **NEW in this session:** `LilRound.sol` now has time-based state transitions. State is derived from `block.timestamp` vs `proposalEndTimestamp`/`votingEndTimestamp`. No more manual `openProposals()`/`openVoting()` — the contract handles it automatically.
- **NEW constructor args:** `(_owner, _houseId, _title, _description, _numWinners, _proposalDuration, _voteDuration)`
- On-chain mode: `NEXT_PUBLIC_SKIP_ONCHAIN=false` (currently `true` for testing)
- Deployer wallet: `0xB875BADbd67c7D5fa2C845ddCE8FE112Fe383309`

### Changes Made This Session (2026-06-11)

**Problem:** Manage/deposit page was inaccessible. Three root causes:
1. No link to `/rounds/[roundId]/manage` from the round detail page
2. `Round` model had no `contractAddress` field (deployed round addresses never stored in DB)
3. The create round wizard never extracted the deployed contract address from the tx receipt

**What we did:**

1. **DB Schema** (`prisma/schema.prisma`):
   - Added `contractAddress String?` to `Round` model
   - Removed `INFINITE` from `RoundType` enum (TIMED only now)
   - Removed `quorumFor`, `quorumAgainst`, `votingPeriod` from `Round`
   - Ran `prisma db push --accept-data-loss`

2. **Smart Contract** (`contracts/LilRound.sol`):
   - Replaced stored `State public state` with `bool completed; bool cancelled;`
   - Added `proposalEndTimestamp`, `votingEndTimestamp` storage
   - Added `currentState()` view — derives state from `block.timestamp` vs deadlines
   - New constructor with `_proposalDuration` and `_voteDuration`
   - Removed `openProposals()` and `openVoting()` — state transitions are now time-based
   - Updated all function guards to time-based checks
   - Removed `inState` modifier, kept `onlyOwner`
   - Compiled successfully with `forge build`

3. **Hooks** (`lib/hooks/`):
   - `useOnChain.ts`: `createRound()` now accepts + passes `proposalDuration`, `voteDuration`; `useRoundChainState()` reads `currentState()` + new timestamps; removed `useOpenVoting()`
   - `useWizardState.ts`: removed `INFINITE` from `roundType`, removed `quorumFor`/`quorumAgainst`/`votingPeriod`
   - `useMutations.ts`: removed `INFINITE` and infinite fields from input type
   - `index.ts`: removed `useOpenVoting` export

4. **Wizard UI**:
   - `app/create/round/page.tsx`: `handleCreate()` passes durations to deploy; `storeRoundInDb(contractAddress?)` accepts + stores deployed address; `useEffect` extracts `receipt.contractAddress`
   - `DatesStep.tsx`: removed INFINITE toggle + quorum fields; always TIMED
   - `ReviewStep.tsx`: removed INFINITE display block

5. **API Routes**:
   - `POST /api/rounds`: added `contractAddress`, removed `quorumFor`/`quorumAgainst`/`votingPeriod`
   - `PATCH /api/rounds/[roundId]`: added `contractAddress` to updatable fields

6. **Round Pages**:
   - `app/rounds/[roundId]/page.tsx`: added "Manage" button (visible to all — anyone can deposit); simplified `isTimed` (always true)
   - `app/rounds/[roundId]/manage/page.tsx`: fixed `isOwner` fallback `: true` → `: false`; removed `useOpenVoting` import/usage

7. **Components**:
   - `RoundCard.tsx`, `RoundList.tsx`: removed `INFINITE` type + conditionals

8. **Types**:
   - `lib/types.ts`: removed `quorumFor`, `quorumAgainst`, `votingPeriod`
   - `lib/eip712.ts`: removed unused `INFINITE_PROPOSAL_MESSAGE_TYPES`

### Deposit Flow (Current)
1. Create round via wizard → deploys `LilRound` on Base + stores `contractAddress` in DB
2. Navigate to `/rounds/[roundId]/manage` via "Manage" button on round detail page
3. Enter ETH amount → click "Deposit ETH" → calls `LilRound.deposit()` with ETH as `msg.value`
4. Anyone can deposit into any active round (not cancelled + not completed)
5. Winners claim awards via `claim()` which transfers ETH from contract balance

### State Transitions (NEW — Time-Based)
| Phase | When | Guard |
|---|---|---|
| `AcceptingProposals` | Deploy until `proposalEndTimestamp` | `block.timestamp < proposalEndTimestamp` |
| `Voting` | `proposalEndTimestamp` until `votingEndTimestamp` | `block.timestamp >= proposalEndTimestamp && < votingEndTimestamp` |
| `Completed` | Owner calls `setWinners()` after voting ends | `block.timestamp >= votingEndTimestamp` |
| `Cancelled` | Owner calls `cancel()` anytime before completed | `!cancelled && !completed` |

### Key Files
| Purpose | Path |
|---------|------|
| Contracts | `contracts/HouseRegistry.sol`, `contracts/LilRound.sol` |
| ABI imports | `lib/contracts/abis.ts` |
| Contract addresses | `lib/contracts/addresses.ts` |
| On-chain hooks | `lib/hooks/useOnChain.ts` |
| Wagmi config | `lib/wagmi.ts` |
| Providers | `app/providers.tsx` |
| Create round page | `app/create/round/page.tsx` |
| Wizard state | `lib/hooks/useWizardState.ts` |
| Wizard components | `components/round-wizard/` |
| Round detail page | `app/rounds/[roundId]/page.tsx` |
| Manage/deposit page | `app/rounds/[roundId]/manage/page.tsx` |
| Homepage | `app/page.tsx` |
| Global styles | `app/globals.css` |
| Webpack config | `next.config.mjs` |

### Session Plan
- `manage_deposit_fix_plan.md` — full plan for this session's changes

### Known Issues
1. **RainbowKit React 19 warning:** `border=0` inline style error in connect modal. Only in dev mode — production builds don't show it. Known RainbowKit v2.2.11 incompatibility. Wait for RainbowKit to ship React 19 fix.
2. **Chain ID mismatch on round deploy:** Fixed via `useChainId` + `switchChain` in hooks. If error persists, ensure MetaMask is on Base network.
3. **WS module error:** Fixed via webpack fallbacks (`ws: false` in `next.config.mjs`).
4. **LilRound contract needs redeployment:** The new time-based version must be redeployed. The ABI changed (new constructor args). Existing deployed rounds use the old contract — they'll continue to work but lack time-based transitions.
5. **No off-chain deposit tracking:** `totalDeposited` lives only on-chain in the contract. DB `fundingAmount` is set once at creation and never updated to reflect deposits.

## Environment Variables (.env — gitignored, never committed)
```
DATABASE_URL=<Supabase PostgreSQL>
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<set>
NEXT_PUBLIC_RPC_URL=<Infura mainnet>
NEXT_PUBLIC_BASE_RPC_URL=<Infura Base>
NEXT_PUBLIC_SUPABASE_URL=<set>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<set>
PINATA_JWT=<set>
NEXT_PUBLIC_SITE_URL=https://lilprophouse.wtf
NEXT_PUBLIC_HOUSE_REGISTRY_ADDRESS=0x3b970E7F0Eb569c043B27C52A8259F1DaE99D539
NEXT_PUBLIC_SKIP_ONCHAIN=true
```

## Start Dev Server
```bash
npm run dev    # Starts on http://localhost:3000
```

## Next Steps (suggested)
1. Redeploy `LilRound` with the new time-based constructor (deployer: `0xB875BADbd67c7D5fa2C845ddCE8FE112Fe383309`)
2. Test the full create → deposit → vote → finalize → claim flow end-to-end on Base
3. Add off-chain deposit syncing (update DB `fundingAmount` when on-chain `DepositReceived` event fires)
4. Add a "Funding Progress" bar on the round detail page (compares on-chain balance to target)
5. Consider adding ERC20 deposit support (currently ETH only)
