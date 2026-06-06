# Base L2 Rebuild Plan — Lil Prop House

## Architecture: Fully On-Chain on Base

Every action is a transaction on Base. Every proposal and vote lives on-chain permanently. No Starknet, no merkle proofs, no off-chain state. Wagmi/viem stack unchanged — just a different chain.

---

## Gas Math (Base L2)

| Action | Est. Gas | USD (~$2000 ETH) |
|--------|----------|-------------------|
| Deploy house | 200,000 | ~$0.50 |
| Deploy round | 300,000 | ~$0.75 |
| Submit proposal (1KB text) | 180,000 | ~$0.45 |
| Cast vote | 60,000 | ~$0.15 |
| Set winners | 80,000 | ~$0.20 |
| Claim award | 100,000 | ~$0.25 |

100 proposals + 500 votes = **~$120 total** for a full round lifecycle.

---

## Contracts

### HouseRegistry.sol

Lightweight factory that tracks which houses exist and who owns them.

```solidity
contract HouseRegistry {
    struct House {
        address owner;
        string name;
        string description;
        string imageURI;
        uint256 createdAt;
    }
    
    House[] public houses;
    
    function createHouse(string name, string description, string imageURI) external returns (uint256 houseId);
    function getHousesForAccount(address account) external view returns (uint256[] memory);
    function houseCount() external view returns (uint256);
}
```

### LilRound.sol

Full round contract with on-chain proposals, votes, deposits, winner selection, and claims.

```solidity
contract LilRound {
    enum State { NotStarted, AcceptingProposals, Voting, Completed, Cancelled }
    
    struct Proposal {
        address proposer;
        string title;
        string content;
        string tldr;
        uint256 requestedAmount;
        uint256 createdAt;
        uint256 votesFor;
        uint256 votesAgainst;
    }
    
    struct Vote {
        address voter;
        uint256 weight;
        bool isFor;
        uint256 timestamp;
    }
    
    State public state;
    address public owner;
    uint256 public houseId;
    string public title;
    string public description;
    uint256 public fundingAmount;
    uint256 public numWinners;
    
    Proposal[] public proposals;
    mapping(uint256 => Vote[]) public proposalVotes;
    mapping(address => uint256) public winners;        // address → amount
    mapping(uint256 => bool) public claimed;            // proposalId → claimed
    
    constructor(address _owner, uint256 _houseId, string memory _title, string memory _description,
                uint256 _fundingAmount, uint256 _numWinners);
    
    // Round lifecycle
    function openProposals() external onlyOwner;
    function openVoting() external onlyOwner;
    function setWinners(address[] calldata winnerAddrs, uint256[] calldata amounts) external onlyOwner;
    function complete() external onlyOwner;
    function cancel() external onlyOwner;
    
    // User actions
    function propose(string calldata _title, string calldata _content, string calldata _tldr, uint256 _requestedAmount) external;
    function vote(uint256 proposalId, uint256 weight, bool isFor) external;
    function claim(uint256 proposalId) external;
    
    // Funding
    receive() external payable;
    function deposit() external payable;
    
    // Views
    function proposalCount() external view returns (uint256);
    function getProposals() external view returns (Proposal[] memory);
}
```

---

## Flow Comparison

| Step | Original PropHouse | Our Lil PropHouse |
|------|-------------------|-------------------|
| Create house | PropHouse factory → CommunityHouse BeaconProxy | `HouseRegistry.createHouse()` |
| Create round | PropHouse factory → TimedRound BeaconProxy | Deploy new `LilRound` via factory |
| Propose | Starknet L2 message | `LilRound.propose()` directly on Base |
| Vote | Starknet L2 message | `LilRound.vote()` directly on Base |
| Deposit | `PropHouse.depositTo()` | `LilRound.deposit()` or direct ETH send |
| Winners | Starknet merkle tree → `finalize()` | `LilRound.setWinners()` by owner |
| Claim | Merkle proof verification | `LilRound.claim()` — simple mapping check |
| Cancel | `TimedRound.cancel()` | `LilRound.cancel()` |

---

## What We Throw Away

The following from our SC-1 through SC-7 are replaced:

| Old (SC Phases) | New |
|-----------------|-----|
| `@prophouse/protocol` ABIs | Our custom contract ABIs |
| `PROP_HOUSE_ADDRESS` (mainnet) | `HOUSE_REGISTRY_ADDRESS` (Base) |
| `COMMUNITY_HOUSE_IMPL` / `TIMED_ROUND_IMPL` | Deployed directly, no BeaconProxy |
| `createRoundOnExistingHouse()` | Deploy `LilRound` contract via factory |
| `createHouse()` with encoded config | `HouseRegistry.createHouse()` |
| Starknet dependency | **None** |
| merkle proofs for claims | Simple `claimed[proposalId]` check |
| `useRoundChainState()` | Direct contract reads via ABI |
| `CreatorPassIssuer` | **Removed** — any account can create rounds |

---

## Execution Phases

### Phase B-1: Contract ABIs & Addresses
- Write `contracts/HouseRegistry.sol` and `contracts/LilRound.sol`
- Compile with `forge` or Hardhat
- Deploy to Base mainnet (or Base Sepolia for testing)
- Update `lib/contracts/abis.ts` with compiled ABIs
- Update `lib/contracts/addresses.ts` with deployed addresses
- Update `.env` with `NEXT_PUBLIC_BASE_RPC_URL` and contract addresses

### Phase B-2: Chain Config
- Update `lib/wagmi.ts` to add Base chain with RPC
- Test wallet connection on Base

### Phase B-3: Rewrite On-Chain Hooks
- Replace `useOnChain.ts` with hooks for our custom contracts:
  - `useCreateHouse()` → calls `HouseRegistry.createHouse()`
  - `useCreateRound()` → deploys new `LilRound`
  - `usePropose()` → calls `LilRound.propose()` on-chain
  - `useVote()` → calls `LilRound.vote()` on-chain
  - `useDeposit()` → calls `LilRound.deposit()` or direct ETH send
  - `useSetWinners()` → calls `LilRound.setWinners()`
  - `useClaim()` → calls `LilRound.claim()`
  - `useCancelRound()` → calls `LilRound.cancel()`
  - Read hooks: `useProposals()`, `useVotes()`, `useRoundState()`
- Remove all @prophouse/protocol imports

### Phase B-4: Update Create Round Wizard
- Step 1 (HouseStep): House creation via `HouseRegistry.createHouse()`
- Step 6 (ReviewStep): Round deployment deploys new `LilRound` contract
- Replace `NEXT_PUBLIC_SKIP_ONCHAIN` logic with real Base deployment

### Phase B-5: Update Round Detail Page
- Read proposals directly from `LilRound.getProposals()`
- Read votes from `LilRound.proposalVotes()`
- Show on-chain vote counts (no DB tallying)
- Add "Set Winners" section for round owner
- Add "Claim" button for winning proposers

### Phase B-6: On-Chain Proposal Submission
- Build proposal submit page that calls `LilRound.propose()` on Base
- Replace EIP-712 signature flow with on-chain transaction
- Full content stored on-chain: `propose(title, content, tldr, requestedAmount)`

### Phase B-7: On-Chain Voting
- Build vote UI that calls `LilRound.vote()` on Base
- Replace EIP-712 signature flow with on-chain vote transactions
- Real-time vote counts from contract

### Phase B-8: Cleanup
- Remove `@prophouse/protocol` dependency (no longer needed)
- Remove `lib/eip712.ts` proposal verification (on-chain voting replaces it)
- Remove Starknet-related code paths
- Remove `NEXT_PUBLIC_SKIP_ONCHAIN` toggle (everything is on-chain now)
- Remove all mainnet PropHouse contract addresses from .env

---

## File Manifest

| # | File | Action |
|---|------|--------|
| 1 | `contracts/HouseRegistry.sol` | **Create** |
| 2 | `contracts/LilRound.sol` | **Create** |
| 3 | `lib/wagmi.ts` | **Update** — Add Base chain |
| 4 | `lib/contracts/abis.ts` | **Rewrite** — Our ABIs |
| 5 | `lib/contracts/addresses.ts` | **Rewrite** — Base addresses |
| 6 | `.env` + `.env.example` | **Rewrite** — Base config |
| 7 | `lib/hooks/useOnChain.ts` | **Rewrite** — Our hooks |
| 8 | `lib/hooks/index.ts` | **Update** — New exports |
| 9 | `components/round-wizard/steps/HouseStep.tsx` | **Update** — Base house creation |
| 10 | `app/create/round/page.tsx` | **Update** — Base round deployment |
| 11 | `app/rounds/[roundId]/page.tsx` | **Rewrite** — On-chain proposal display + claim |
| 12 | `components/round-wizard/steps/ReviewStep.tsx` | **Update** — Base deployment text |
| 13 | `app/rounds/[roundId]/manage/page.tsx` | **Rewrite** — Set winners, cancel |
| 14 | `lib/hooks/useOnChain.ts` | Already counted above |
| — | Remove: `lib/eip712.ts` (proposal/vote verification) | **Delete** |
| — | Remove: `@prophouse/protocol` dependency | **Uninstall** |
| — | Remove: `NEXT_PUBLIC_PROP_HOUSE_ADDRESS` etc. | **Cleanup** |

**Total: ~14 files changed/created**

---

## Acceptance Criteria

1. User switches to Base chain in wallet → sees Base houses, rounds
2. Creating a house deploys it on Base (~$0.50)
3. Creating a round deploys a `LilRound` contract on Base (~$0.75)
4. Submitting a proposal stores full content on Base (~$0.45)
5. Casting a vote records it on Base (~$0.15)
6. Round owner sets winners on-chain
7. Each winner sees a "Claim Award" button → one-click claim
8. Every proposal is readable from the contract forever
9. Zero off-chain state for core round logic
10. Zero Starknet dependency

---

## What We Keep

- All 10 wizard steps (same UX, different contract calls)
- Header, Footer, Homepage styling
- OG cards, SEO, analytics
- Supabase replies
- House cards, round lists, status pills
- `NEXT_PUBLIC_SKIP_ONCHAIN` (for local dev without Base deployment)
