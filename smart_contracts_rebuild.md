# Smart Contracts Rebuild Plan

## Strategy: Use Existing Deployed Mainnet Contracts

The Prop House protocol contracts are **already deployed on Ethereum mainnet** at known addresses. Instead of deploying new contracts, we interact with these existing deployments. Your houses and rounds are deployed as separate contracts under your wallet's ownership — completely isolated from the prop.house domain's houses/rounds.

---

## Deployed Mainnet Addresses

| Contract | Address | Purpose |
|----------|---------|---------|
| `PropHouse` | `0x000000002C93CAD6F9cFD00C603aEf62458d8A48` | Factory — deploy houses + rounds, deposit assets |
| `Manager` | `0xE867928874439b6C48fB42e908BA0519f287932A` | Controls deployable implementations (PH team multisig) |
| `Messenger` | `0xf6A66b137B993A4571329cdC9F2523AC8da01649` | L1↔L2 message bridge (internal) |
| `CreatorPassIssuer` | `0x392d429Dfa457C216C35fc6EBaf34c42de4aEAB5` | ERC1155 token for creator authorization |
| `CommunityHouseImpl` | `0x92eE1cCdf3AA2E39E3F519B95fee2A601A28663D` | Community house BeaconProxy implementation |
| `TimedRoundImpl` | `0x43c015Df7f3868B287ad94D88b1E05F596BBa453` | Timed round BeaconProxy implementation |

---

## Execution Phases

### Phase SC-1: Contracts Foundation

**Goal:** Extract ABIs, add addresses to env, create contract interaction layer.

**Files to create/modify:**

1. **`lib/contracts/abis.ts`** — Full verified ABIs for all contracts
   - Extract ABIs from `node_modules/@prophouse/sdk` build output or the legacy protocol package
   - Key ABIs needed: `PropHouse`, `CommunityHouse`, `TimedRound`, `InfiniteRound`, `CreatorPassIssuer`
   - Fallback: fetch from Etherscan verified contracts

2. **`.env`** — Add contract addresses
   - `NEXT_PUBLIC_PROP_HOUSE_ADDRESS=0x000000002C93CAD6F9cFD00C603aEf62458d8A48`
   - `NEXT_PUBLIC_COMMUNITY_HOUSE_IMPL=0x92eE1cCdf3AA2E39E3F519B95fee2A601A28663D`
   - `NEXT_PUBLIC_TIMED_ROUND_IMPL=0x43c015Df7f3868B287ad94D88b1E05F596BBa453`

3. **`lib/contracts/addresses.ts`** — Typed contract address map
   - Import from env vars
   - Export typed address constants

4. **Update `lib/hooks/useOnChain.ts`** — Replace stub ABIs with real ones
   - Replace `ROUND_FACTORY_ABI` with real `PropHouse` ABI
   - Replace `ROUND_CONTRACT_ABI` with real `TimedRound`/`InfiniteRound` ABIs
   - Wire in actual contract addresses from `addresses.ts`

### Phase SC-2: Read On-Chain Houses

**Goal:** Show user's on-chain houses in the create round wizard (Step 1).

**Files to modify:**

1. **`lib/hooks/useOnChain.ts`** — Add read hook
   - `useHousesOnChain()` — calls `PropHouse.getHousesForAccount(address)` via wagmi `useReadContract`
   - Returns array of house addresses + metadata

2. **`components/round-wizard/steps/HouseStep.tsx`** — Merge on-chain + off-chain houses
   - Current: only shows houses from DB (`GET /api/houses`)
   - New: also show houses from chain, deduplicate by contract address
   - Each on-chain house gets a DB record created if missing
   - Selection triggers same wizard flow

**Edge cases:**
- House exists on-chain but not in DB → create DB record silently
- House exists in DB but not on-chain (off-chain test house) → show as "Test" house
- Wallet owns zero houses → only show "Create new house" option

### Phase SC-3: Deploy Houses On-Chain

**Goal:** When user creates a house, deploy it on-chain via the PropHouse factory.

**Files to modify:**

1. **`components/round-wizard/steps/HouseStep.tsx`** — "Create new house" flow
   - When user clicks "Create house":
     1. Call `PropHouse.createCommunityHouse(name, description)` via wagmi `useWriteContract`
     2. Wait for tx receipt
     3. Read the deployed house address from the event log
     4. Store house metadata in DB via `POST /api/houses`
     5. Auto-advance to Step 2

2. **`app/create/round/page.tsx`** — Transaction flow
   - Show tx status (pending → confirming → confirmed)
   - Handle errors (user rejected, gas too low, etc.)
   - Display tx hash with Etherscan link

### Phase SC-4: Deploy Rounds On-Chain

**Goal:** When user creates a round, deploy it on-chain via the PropHouse factory.

**Files to modify:**

1. **`app/create/round/page.tsx`** — Step 6 deployment flow
   - When user clicks "Create Round":
     1. If house doesn't exist on-chain → deploy house first
     2. Call `PropHouse.createTimedRound(houseId, params)` or `createInfiniteRound(houseId, params)` via wagmi
     3. Wait for tx receipt
     4. Read the deployed round address from the event log
     5. Store round metadata in DB via `POST /api/rounds`
     6. Navigate to the round page

2. **Round creation params from wizard state:**
   - `title`, `description` → round contract constructor
   - `proposalPeriodStartTimestamp`, `proposalPeriodDurationSecs`, `votePeriodDurationSecs` → TimedRound
   - `quorumFor`, `quorumAgainst`, `votingPeriod` → InfiniteRound
   - `numWinners`, `awards` → round config (stored as metadata, used for display)

### Phase SC-5: Read Round State & Proposals

**Goal:** Display on-chain round data on round detail page.

**Files to modify:**

1. **`app/rounds/[roundId]/page.tsx`** — Merge on-chain + off-chain data
   - Read round state from TimedRound/InfiniteRound contract
   - If state differs from DB, update DB and reflect latest on-chain state
   - Show tx history (when round was created, who deployed it)

2. **`lib/services/roundService.ts`** — Add state sync
   - `getRoundById()` → also reads on-chain state via RPC
   - Returns merged data with `chainState` field

### Phase SC-6: Round Management

**Goal:** Enable round owner actions — cancel, finalize, claim awards.

**Files to modify:**

1. **`app/rounds/[roundId]/manage/page.tsx`** — Wire real contract calls
   - "Cancel Round" → `roundContract.cancel()` via wagmi
   - "Finalize Round" → `timedRound.finalize()` via wagmi
   - "Claim Award" → `timedRound.claim()` or `infiniteRound.claim()` via wagmi
   - "Deposit Assets" → `propHouse.deposit()` via wagmi
   - Only show actions when wallet is round owner (check `round.owner() === address`)

2. **Deposit flow:**
   - User selects asset type (ETH, ERC20, ERC721, ERC1155)
   - Enters amount / token ID
   - Approves token if ERC20
   - Calls `PropHouse.deposit(roundId, asset, amount)`

### Phase SC-7: Creator Passes

**Goal:** Allow house owners to invite others to create rounds.

**Files to create/modify:**

1. **`app/houses/[address]/manage/page.tsx`** — New house manager page
   - "Issue Creator Pass" → `CreatorPassIssuer.safeTransferFrom(houseId, to)` via wagmi
   - "Revoke Creator Pass" → `CreatorPassIssuer.burn(houseId, from)` via wagmi
   - List current pass holders

2. **`components/house/HouseUtilityBar.tsx`** — Add "Manage" link
   - Link to `/houses/[address]/manage` for house owners

---

## File Manifest

| # | File | Action |
|---|------|--------|
| 1 | `lib/contracts/abis.ts` | **Create** — Full ABIs |
| 2 | `lib/contracts/addresses.ts` | **Create** — Typed addresses |
| 3 | `.env` | **Update** — Add contract addresses |
| 4 | `.env.example` | **Update** — Document new vars |
| 5 | `lib/hooks/useOnChain.ts` | **Rewrite** — Real ABIs + addresses |
| 6 | `components/round-wizard/steps/HouseStep.tsx` | **Update** — On-chain houses |
| 7 | `app/create/round/page.tsx` | **Update** — On-chain deployment |
| 8 | `app/rounds/[roundId]/page.tsx` | **Update** — Chain state sync |
| 9 | `lib/services/roundService.ts` | **Update** — Merge on-chain state |
| 10 | `app/rounds/[roundId]/manage/page.tsx` | **Rewrite** — Real contract calls |
| 11 | `app/houses/[address]/manage/page.tsx` | **Create** — House manager |
| 12 | `components/house/HouseUtilityBar.tsx` | **Update** — Manage link |

**Total: 12 files**

---

## Out of Scope (V1)

| Feature | Reason |
|---------|--------|
| Starknet L2 integration | Requires separate Starknet client, L1↔L2 message relay infrastructure |
| On-chain proposing/voting | Currently only works via Starknet; proposals/votes stay off-chain via DB + EIP-712 |
| Asset deposits for existing rounds | Phase SC-6 handles this, but V1 can skip if rounds are pre-funded |
| Cross-chain verification | L1↔L2 message verification requires Starknet RPC node setup |

---

## Acceptance Criteria

1. User connects wallet → sees their on-chain houses in the create round wizard
2. User creates a new house → deployed on-chain via PropHouse factory
3. User creates a round → deployed on-chain via PropHouse factory  
4. Round detail page reads on-chain state and syncs with DB
5. Round owner can cancel/finalize their round via the manage page
6. Tx status is displayed with Etherscan links during deployment
