# Manage/Deposit Fix + On-Chain Time-Based Transitions Plan

## Summary
16 files touched across 9 phases. Fixes manage/deposit page accessibility, makes state transitions time-based on-chain, and removes the INFINITE round type.

## Phase A — DB Schema

### `prisma/schema.prisma`
1. Add `contractAddress String?` to `Round` model
2. Remove `quorumFor`, `quorumAgainst`, `votingPeriod` from `Round`
3. Remove `INFINITE` from `RoundType` enum

### Commands
```bash
npx prisma migrate dev --name add_contract_address_and_remove_infinite
```

---

## Phase B — Smart Contract: Time-Based State

### `contracts/LilRound.sol`
1. Replace `State public state` with `bool public completed; bool public cancelled;`
2. Add `uint256 public proposalEndTimestamp; uint256 public votingEndTimestamp;`
3. Add `function currentState() public view returns (State)` — derives state from block.timestamp vs deadlines
4. New constructor args: add `_proposalDuration`, `_voteDuration`
5. Remove `openProposals()` and `openVoting()` entirely
6. Update guards to time-based checks
7. Remove `inState` modifier, keep `onlyOwner` modifier
8. Emit `RoundStateChanged` events at construction, setWinners, cancel

### Commands
```bash
forge build
```

---

## Phase C — Hooks

### `lib/hooks/useOnChain.ts`
- `useCreateRoundOnChain()` — add proposalDuration, voteDuration params (args 6, 7)
- `useRoundChainState()` — read `currentState()` instead of `state()`, add proposalEndTimestamp/votingEndTimestamp reads
- Remove `useOpenVoting()` hook entirely

### `lib/hooks/useWizardState.ts`
- Remove `'INFINITE'` from roundType, remove quorumFor/quorumAgainst/votingPeriod
- Remove from INITIAL_STATE and isStepValid

### `lib/hooks/useMutations.ts`
- Remove `'INFINITE'` from createRound input, remove quorumFor/quorumAgainst/votingPeriod

---

## Phase D — Wizard UI

### `app/create/round/page.tsx`
- `handleCreate()` — pass durations to deploy
- `storeRoundInDb(contractAddress?)` — accept and pass contractAddress, remove infinite fields
- `useEffect` — extract receipt.contractAddress, pass to storeRoundInDb

### `components/round-wizard/steps/DatesStep.tsx`
- Remove roundType prop, quorumFor/quorumAgainst/votingPeriod
- Remove TIMED/INFINITE toggle, remove infinite fields

### `components/round-wizard/steps/ReviewStep.tsx`
- Remove INFINITE block, remove infinite fields from DatesStep pass-through

---

## Phase E — API Routes

### `app/api/rounds/route.ts` (POST)
- Add `contractAddress: body.contractAddress ?? null`
- Remove quorumFor/quorumAgainst/votingPeriod

### `app/api/rounds/[roundId]/route.ts` (PATCH)
- Add contractAddress to updatable fields
- Remove quorumFor/quorumAgainst/votingPeriod from updatable fields

---

## Phase F — Round Pages

### `app/rounds/[roundId]/page.tsx`
- Add "Manage" link (visible to all — anyone can deposit)
- Simplify isTimed (always true)

### `app/rounds/[roundId]/manage/page.tsx`
- Fix isOwner fallback: `: true` → `: false`
- Remove useOpenVoting import and usage

---

## Phase G — Components

### `components/round/RoundCard.tsx`
- Change `type` from `'TIMED' | 'INFINITE'` to `'TIMED'`
- Remove INFINITE conditional

### `components/RoundList.tsx`
- Change `type` from `'TIMED' | 'INFINITE'` to `'TIMED'`
- Remove INFINITE conditional, simplify date display

---

## Phase H — Types

### `lib/types.ts`
- Remove quorumFor, quorumAgainst, votingPeriod from `RoundWithProposals`

### `lib/eip712.ts`
- Remove `INFINITE_PROPOSAL_MESSAGE_TYPES`

---

## Phase I — Final Integration

```bash
forge build
npx prisma generate
npx prisma migrate dev --name add_contract_address_and_remove_infinite
npm run dev
```

---

## Execution Order
A → B → forge build → I(abi regen) → C → D → E → F → G → H → I(prisma regen) → verify
