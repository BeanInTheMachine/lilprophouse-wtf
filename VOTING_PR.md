# Voting System — PRD

## Overview

Fix all 7 voting gaps and add on-chain token gating with fully automated winner finalization. The voting strategy configured by the round creator in the wizard is enforced on-chain — the contract computes vote weight internally, gates eligibility, and auto-assigns awards after voting closes. No owner intervention needed after round deployment.

---

## 1. Smart Contract Changes (`contracts/LilRound.sol`)

### 1.1 New Enums & Structs

```solidity
enum VoteStrategyType { BALANCE_OF_ERC721, BALANCE_OF_ERC20, BALANCE_OF_ERC1155, ALLOWLIST }
enum AssetType { ETH, ERC20, ERC721, ERC1155 }

struct AwardConfig {
    AssetType assetType;
    address tokenAddress;   // 0x0 for ETH
    uint256 tokenId;        // for ERC721/ERC1155, 0 otherwise
    uint256 amountPerWinner;
}
```

### 1.2 New Storage

| Name | Type | Purpose |
|---|---|---|
| `voteStrategyType` | `VoteStrategyType` | Which strategy governs voting |
| `votingToken` | `address` | Token contract (0x0 for ALLOWLIST) |
| `votingTokenId` | `uint256` | ERC1155 token ID (0 otherwise) |
| `voteMultiplier` | `uint256` | Weight multiplier from wizard |
| `allowlistRoot` | `bytes32` | Merkle root (ALLOWLIST only) |
| `awardConfigs` | `AwardConfig[]` | Per-position award definitions |
| `winnerPositions` | `mapping(uint256 => uint256)` | proposalId → award position index |

### 1.3 Updated Constructor

**Existing params** (unchanged):
`_owner`, `_houseId`, `_title`, `_description`, `_numWinners`, `_proposalDuration`, `_voteDuration`

**New params:**
`_voteStrategyType`, `_votingToken`, `_votingTokenId`, `_voteMultiplier`, `_allowlistRoot`, `_awardConfigs`

### 1.4 `vote()` — Rewritten

**Old signature:** `vote(uint256 _proposalId, uint256 _weight, bool _isFor)`

**New signature:** `vote(uint256 _proposalId, bool _isFor)`

Weight is computed internally based on strategy:
- `BALANCE_OF_ERC721`: `IERC721(votingToken).balanceOf(msg.sender) * voteMultiplier`
- `BALANCE_OF_ERC20`: `IERC20(votingToken).balanceOf(msg.sender) * voteMultiplier`
- `BALANCE_OF_ERC1155`: `IERC1155(votingToken).balanceOf(msg.sender, votingTokenId) * voteMultiplier`
- `ALLOWLIST`: verify Merkle proof `(msg.sender, weight)` against `allowlistRoot`, use the proven weight

Requires `weight > 0`. Live balance at vote time (no snapshot).

### 1.5 `verifyMerkleProof()` — New

Standard Merkle proof verification:
- Accept `bytes32[] proof` and `bytes32 leaf`
- Hash up the tree, compare against `allowlistRoot`
- Used internally by `vote()` for ALLOWLIST strategy

### 1.6 `finalizeRound()` — Replaces `setWinners()`

**Old:** `setWinners(uint256[] _proposalIds, uint256[] _amounts) external onlyOwner`

**New:** `finalizeRound(uint256[] calldata _proposalIds) external`

Key differences:
- `onlyOwner` removed — **anyone** can call
- `_amounts` removed — awards come from pre-stored `awardConfigs`
- Verification (O(n)):
  1. Mark submitted IDs in a `bool[] isWinner` array
  2. Verify descending vote order: `votesFor[i] >= votesFor[i+1]`
  3. Find `minWinnerVotes` from the last winner
  4. Scan all proposals: every non-winner must have `votesFor <= minWinnerVotes`
- Assigns `winnerPositions[proposalId] = i`, mapping to `awardConfigs[i]`
- Emits `WinnersSet`, marks `completed = true`

Tiebreaker: if votes are equal at the boundary, the caller decides which proposals to include.

### 1.7 `claim()` — Expanded

Reads `winnerPositions[proposalId]` → `AwardConfig`. Dispatches by `assetType`:

| AssetType | Action |
|---|---|
| `ETH` | `transfer(winner, amountPerWinner)` — checks contract ETH balance |
| `ERC20` | `transferFrom(address(this), winner, amountPerWinner)` — from deposited tokens |
| `ERC721` | `transferFrom(address(this), winner, tokenId)` — must have been deposited |
| `ERC1155` | `safeTransferFrom(address(this), winner, tokenId, amountPerWinner)` |

Existing `claimed[proposalId]` flag prevents double claims. The pre-existing `depositedNFTs`/`setWinnerNfts` system is untouched for bonus/optional NFT rewards beyond structured awards.

---

## 2. Merkle Tree Utility (`lib/merkle.ts` — new file)

**Inline implementation** (~30 lines, no dependency):

```
buildMerkleTree(members: { address: string; weight: string }[])
  → { root: `0x${string}`; proofs: Map<address, bytes32[]> }
```

- Hash each member: `keccak256(address, weight)` → leaf
- Sort leaves, then pairwise-hash up the tree
- Generate compact proof per leaf (sibling hashes)

Uses `viem`'s `keccak256` (already a dependency).

---

## 3. Frontend Changes

### 3.1 Contract Deployment (`lib/hooks/useOnChain.ts`)

**`createRound()`** — 7 new params added to deploy encoding:
`voteStrategyType`, `votingToken`, `votingTokenId`, `voteMultiplier`, `allowlistRoot`, `awardTypes[]`, `awardConfigs[]`

**`useVoteOnChain()`** — `vote(roundAddress, proposalId, isFor)` — **`weight` param removed**.

**`useSetWinners()`** → **`useFinalizeRound()`** — calls `finalizeRound(proposalIds[])` (no `amounts` param).

### 3.2 Create Round Wizard (`app/create/round/page.tsx`)

- For ALLOWLIST: build Merkle tree from members, pass `root` to deployment
- For BALANCE_OF types: pass `votingToken` address and `multiplier`
- Convert award amounts: ETH → wei (`* 1e18`), ERC20 → raw units (`* 10^decimals`)
- Build `AwardConfig[]` from wizard's `awards` array

### 3.3 Round Detail Page (`app/rounds/[roundId]/page.tsx`)

**Voting section (per proposal):**
- Use `useHasVotedOn(contractAddress, proposalId, wallet)` to check if already voted
- If `hasVoted` → show "Voted" badge, disable all vote buttons
- Three buttons: **Vote For** (green) | **Vote Against** (red) | **Abstain** (gray)
- Vote call: `vote(roundAddress, proposalId, isFor)` — no weight param
- After tx confirms → `POST /api/votes` to sync DB with direction + weight

**Strategy display:**
- Read `round.voteStrategy` JSON from DB
- Show human-readable description (e.g., "Token holders of 0xA0b8… ×2" or "Allowlist — 42 voters")

### 3.4 Proposal Detail Page (`app/proposals/[proposalId]/page.tsx`)

- Same `useHasVotedOn` check
- Same three-button layout (For / Against / Abstain)
- Remove hardcoded `weight: 1`
- Post-vote DB sync via `useSubmitVotes()`

### 3.5 Manage Page (`app/rounds/[roundId]/manage/page.tsx`)

**New "Finalize Round" section** (visible when `VOTING` state ends):
- Proposals ranked by `votesFor` descending with vote counts
- Award amounts shown per position (from DB)
- "Finalize Round" button — visible to **anyone**, not just owner
- Calls `finalizeRound(winnerIds)` — contract verifies and assigns awards
- After completion, shows winners with their awards

**Removed:**
- `onlyOwner` guard on finalization
- `setWinners` reference (replaced by `finalizeRound`)

---

## 4. Database / API Changes

### 4.1 Wire Off-Chain Vote Sync

After successful on-chain `vote()` transaction, call `submitVotes()` from `useSubmitVotes()` to store the vote in DB:

```ts
POST /api/votes  { votes: [{ direction, weight, address, proposalId, roundId, signature, ... }] }
```

Currently this hook is completely unwired. Both vote pages will call it after transaction confirmation.

### 4.2 Read Vote Strategy

`app/rounds/[roundId]/page.tsx` reads `round.voteStrategy` (JSON field) to display "Who can vote" information.

---

## 5. Removed / Cleaned Up

| Item | Reason |
|---|---|
| `_weight` param from `vote()` everywhere | Computed on-chain |
| `setWinners()` contract function | Replaced by `finalizeRound()` |
| `onlyOwner` on finalization | Voting results are objective, anyone can finalize |
| `useVotingPower()` hook (simplified) | Weight computed on-chain; keep as read-only display helper |
| Hardcoded `weight: 1` in all frontend vote calls | No longer passed as param |

---

## 6. Vote Strategy Matrix

| Strategy | Wizard Input | Contract Storage | `vote()` Behavior |
|---|---|---|---|
| `BALANCE_OF_ERC721` | Token address + multiplier | `votingToken`, `voteMultiplier` | `balanceOf(voter) * multiplier` |
| `BALANCE_OF_ERC20` | Token address + multiplier | `votingToken`, `voteMultiplier` | `balanceOf(voter) * multiplier` |
| `BALANCE_OF_ERC1155` | Token address + token ID + multiplier | `votingToken`, `votingTokenId`, `voteMultiplier` | `balanceOf(voter, tokenId) * multiplier` |
| `ALLOWLIST` | Addresses + vote weights | `allowlistRoot` (bytes32) | Verify Merkle proof, use weight from proof |

---

## 7. Files Summary

| File | Status | Change |
|---|---|---|
| `contracts/LilRound.sol` | Modify | Enums, storage, constructor, `vote()`, `finalizeRound()`, `claim()`, `verifyMerkleProof()` |
| `lib/merkle.ts` | **New** | `buildMerkleTree()` inline utility |
| `lib/hooks/useOnChain.ts` | Modify | `createRound()` params, `useVoteOnChain()` signature, `useFinalizeRound()` (new) |
| `lib/hooks/useWeb3.ts` | Modify | Simplify `useVotingPower()` |
| `app/create/round/page.tsx` | Modify | Build Merkle root, encode award configs, pass to deployment |
| `app/rounds/[roundId]/page.tsx` | Modify | `useHasVotedOn`, ABSTAIN button, remove weight=1, strategy display, wire `useSubmitVotes` |
| `app/proposals/[proposalId]/page.tsx` | Modify | `useHasVotedOn`, ABSTAIN button, remove weight=1, wire `useSubmitVotes` |
| `app/rounds/[roundId]/manage/page.tsx` | Modify | Finalize section: sorted proposals, open to anyone, remove onlyOwner |
| `out/LilRound.sol/LilRound.json` | Regenerate | Recompile with Forge |

---

## 8. Edge Cases

- **Fewer proposals than `numWinners`**: `finalizeRound()` accepts fewer IDs → all proposals win
- **Vote ties**: caller chooses which proposals to include; contract verifies gap rule
- **ALLOWLIST + no Merkle proof**: `vote()` reverts if proof is invalid
- **Token with 0 balance**: `vote()` reverts with "Weight must be > 0"
- **Award not yet deposited**: `claim()` reverts if contract lacks sufficient balance (ETH/ERC20) or ownership (NFT)
- **Double claim**: prevented by existing `claimed[proposalId]` flag
- **Double finalize**: prevented by `completed` flag
