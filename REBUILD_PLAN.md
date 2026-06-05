# Prop House Rebuild Plan

## Architecture Decision Summary
- **Stack:** Next.js 14+ App Router, TypeScript, Prisma ORM, PostgreSQL, Tailwind CSS
- **Web3:** wagmi v2 + RainbowKit + viem
- **State Management:** wagmi for Web3 state, React hooks + Context for UI state. No Redux.
- **On-chain Data:** `@prophouse/sdk-react` (keep existing on-chain interaction layer)
- **Styling:** Tailwind CSS (replacing Bootstrap 5 + custom CSS)
- **i18n:** Dropped for now (English only, re-add later)
- **Schema:** Refactored — `auction` → `round`, `community` → `house`, cleaner naming
- **Directory:** Flat — no `src/` directory. All paths from project root.

---

## Phase 1: Project Scaffolding & Prisma Schema

### 1.1 — Initialize Next.js App
- `npx create-next-app@latest` with TypeScript, Tailwind, App Router, **NO `src/` directory**
- Configure `tsconfig.json` path aliases (`@/components/*`, `@/lib/*`, `@/hooks/*`, etc.)
- All paths relative to project root: `app/`, `components/`, `lib/`, `hooks/`, `prisma/`
- Set up ESLint, Prettier matching legacy `.prettierrc` (single quotes, 100 print width)

### 1.2 — Prisma Schema & Database
- Install Prisma: `@prisma/client`, `prisma`
- Define models in `prisma/schema.prisma`:

```prisma
model House {
  id               Int      @id @default(autoincrement())
  visible          Boolean  @default(true)
  contractAddress  String
  name             String
  profileImageUrl  String
  description      String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  rounds           Round[]
}

enum RoundType {
  TIMED
  INFINITE
}

enum RoundState {
  NOT_STARTED
  ACCEPTING_PROPOSALS
  VOTING
  COMPLETED
  CANCELLED
}

model Round {
  id                      Int       @id @default(autoincrement())
  visible                 Boolean   @default(true)
  type                    RoundType
  title                   String
  description             String?
  fundingAmount           Decimal   @default(0)
  currencyType            String?
  numWinners              Int
  startTime               DateTime
  proposalEndTime         DateTime?
  votingEndTime           DateTime?
  balanceBlockTag         Int       @default(0)
  propStrategy            Json
  voteStrategy            Json
  propStrategyDescription String?
  voteStrategyDescription String?
  displayComments         Boolean   @default(true)
  quorumFor               Int?
  quorumAgainst           Int?
  votingPeriod            Int?
  state                   RoundState
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  houseId                 Int
  house                   House     @relation(fields: [houseId], references: [id])
  proposals               Proposal[]
}

enum Direction {
  FOR
  AGAINST
  ABSTAIN
}

model Proposal {
  id              Int       @id @default(autoincrement())
  title           String
  content         String
  tldr            String
  address         String
  reqAmount       Decimal?
  voteCountFor    Int       @default(0)
  voteCountAgainst Int      @default(0)
  deletedAt       DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  roundId         Int
  round           Round     @relation(fields: [roundId], references: [id])
  votes           Vote[]
}

model Vote {
  id               Int       @id @default(autoincrement())
  direction        Direction
  weight           Int
  blockHeight      Int       @default(0)
  address          String
  communityAddress String
  signature        String
  signedMessage    String
  createdAt        DateTime  @default(now())
  proposalId       Int
  proposal         Proposal  @relation(fields: [proposalId], references: [id])
  roundId          Int
}

model File {
  id          Int      @id @default(autoincrement())
  hidden      Boolean  @default(false)
  address     String
  name        String
  mimeType    String
  ipfsHash    String
  pinSize     String
  ipfsTimestamp String
  createdAt   DateTime @default(now())
}
```

- Generate migration: `npx prisma migrate dev --name init`
- Write seed script (`prisma/seed.ts`) with sample Houses, Rounds, Proposals

### 1.3 — Prisma Client Singleton
- Create `lib/prisma.ts` exporting a singleton PrismaClient instance
- Create `lib/types.ts` with shared TypeScript types mirroring Prisma models

---

## Phase 2: Global Theme System

### 2.1 — Tailwind Theme Configuration
- Extend `tailwind.config.ts` with the legacy color palette:

```ts
colors: {
  brand: {
    pink:    '#e02ecf',
    purple:  '#8a2be2',
    yellow:  '#cba727',
    green:   '#50ba9a',
    black:   '#14161b',
    red:     '#e02e2e',
    gray:    '#666666',
  },
  surface: {
    light:   '#ffffff',
    med:     '#fcfcfc',
    dark:    '#f5f5f5',
  },
  border: {
    light:   'rgba(0, 0, 0, 0.04)',
    med:     'rgba(0, 0, 0, 0.1)',
    dark:    'rgba(102, 102, 102, 0.25)',
  },
}
```

- Define shadow utilities matching `--shadow-low` (`0px 4px 12px rgba(0,0,0,0.03)`) and `--shadow-high` (`0px 2px 8px rgba(0,0,0,0.08)`)
- Configure container max-width: 992px (matching legacy `992px` constraint)
- Add CSS variables in `globals.css` for the gradient backgrounds (`homeGradientBg`, `gradientBg`)

### 2.2 — Font Loading
- Download PT Root UI fonts to `public/fonts/` (Bold, Medium, Regular, Light .woff2)
- Add `@font-face` declarations in `app/globals.css`
- Import Inter + Londrina Solid from Google Fonts via `next/font` in layout
- Set PT Root UI as default font family in Tailwind config

### 2.3 — Design Token Variables
- Extract all CSS custom properties from legacy `globals.css` into Tailwind `@layer base`
- Parse all `--brand-*`, `--bg-*`, `--border-*`, `--shadow-*` variables
- Map legacy Bootstrap utility classes to Tailwind equivalents

### 2.4 — Root Layout & Providers
- `app/layout.tsx`:
  - Server component importing `app/globals.css`
  - Wrap children in `<Providers>` client component
  - Default metadata (title: "Prop House", description)
  - `body` with `min-h-screen flex flex-col`
- `app/providers.tsx` (`'use client'`):
  - `WagmiProvider` from wagmi v2 (mainnet only, `http()` transport)
  - `RainbowKitProvider` with `lightTheme({ accentColor: '#8a2be2' })`
  - `PropHouseProvider` from `@prophouse/sdk-react`
  - `QueryClientProvider` from `@tanstack/react-query` (wagmi uses this internally)
  - All Web3 and UI state handled by hooks within React tree — **no Redux provider**
- Create `lib/wagmi.ts`:
  - wagmi `createConfig` with mainnet chain, public HTTP transport
  - Export `config` for `WagmiProvider`

---

## Phase 3: Shared UI Component Library

Build each component in isolation, matching legacy visual behavior exactly. All components in `components/` at project root.

### 3.1 — Primitive Components
| Component | File | Description | Legacy Source |
|-----------|------|-------------|---------------|
| `Button` | `components/ui/Button.tsx` | Pill-shaped, purple accent, outlined variant | `components/Button` |
| `Modal` | `components/ui/Modal.tsx` | Backdrop blur, centered, max-width constrained | `components/Modal` |
| `Card` | `components/ui/Card.tsx` | White bg, rounded-xl, shadow-low, hover:shadow-high | `components/Card` |
| `Divider` | `components/ui/Divider.tsx` | Horizontal rule with border-med | `components/Divider` |
| `Banner` | `components/ui/Banner.tsx` | Colored top banner for status messages | `components/Banner` |
| `Countdown` | `components/ui/Countdown.tsx` | Timer countdown (uses dayjs) | `components/Countdown` |
| `InputFormGroup` | `components/ui/InputFormGroup.tsx` | Label + input with error states | `components/InputFormGroup` |
| `LoadingIndicator` | `components/ui/LoadingIndicator.tsx` | Spinner overlay | `components/LoadingIndicator` |
| `LoadingCards` | `components/ui/LoadingCards.tsx` | Skeleton card grid | `components/LoadingCards` |
| `ReadMore` | `components/ui/ReadMore.tsx` | Expandable text truncation | `components/ReadMore` |

### 3.2 — Domain Components
| Component | File | Description | Legacy Source |
|-----------|------|-------------|---------------|
| `HouseCard` | `components/house/HouseCard.tsx` | House display card with image, name, round count | `components/HouseCard` |
| `HouseHeader` | `components/house/HouseHeader.tsx` | House profile header with banner image | `components/HouseHeader` |
| `HouseProfImg` | `components/house/HouseProfImg.tsx` | Circular house profile image | `components/HouseProfImg` |
| `HouseTabBar` | `components/house/HouseTabBar.tsx` | Tab bar for house detail | `components/HouseTabBar` |
| `HouseUtilityBar` | `components/house/HouseUtilityBar.tsx` | Utility bar with create round button | `components/HouseUtilityBar` |
| `RoundCard` | `components/round/RoundCard.tsx` | Round display card | `components/RoundCard` |
| `RoundHeader` | `components/round/RoundHeader.tsx` | Round detail header | `components/RoundHeader` |
| `RoundContent` | `components/round/RoundContent.tsx` | Full round detail layout | `components/RoundContent` |
| `RoundCardStatusBar` | `components/round/RoundCardStatusBar.tsx` | Color-coded status bar | `components/RoundCardStatusBar` |
| `RoundAwardsDisplay` | `components/round/RoundAwardsDisplay.tsx` | Shows awards for winners | `components/RoundAwardsDisplay` |
| `RoundModuleCard` | `components/round/RoundModuleCard.tsx` | Card for round phases | `components/RoundModuleCard` |
| `ProposalCard` | `components/proposal/ProposalCard.tsx` | Proposal list item | `components/HousePropCard` |
| `ProposalContent` | `components/proposal/ProposalContent.tsx` | Full proposal detail + markdown | `components/ProposalContent` |
| `ProposalHeaderAndBody` | `components/proposal/ProposalHeaderAndBody.tsx` | Header + body layout | `components/ProposalHeaderAndBody` |
| `ProposalEditor` | `components/proposal/ProposalEditor.tsx` | Rich text editor (react-quill) | `components/ProposalEditor` |
| `ProposalModal` | `components/proposal/ProposalModal.tsx` | Modal for proposal detail + voting | `components/ProposalModal` |
| `StatusPill` | `components/ui/StatusPill.tsx` | Status badge (proposing/voting/complete) | `components/AuctionStatusPill` |
| `AddressAvatar` | `components/ui/AddressAvatar.tsx` | Address-based jazzicon avatar | `components/AddressAvatar` |
| `EthAddress` | `components/ui/EthAddress.tsx` | Truncated ETH address display | `components/EthAddress` |
| `NavBar` | `components/layout/NavBar.tsx` | Top nav: logo, create, connect | `components/NavBar` |
| `Footer` | `components/layout/Footer.tsx` | Bottom footer with links | `components/Footer` |
| `NotFound` | `components/layout/NotFound.tsx` | 404 page | `components/NotFound` |
| `ErrorMessageCard` | `components/ui/ErrorMessageCard.tsx` | Error display card | `components/ErrorMessageCard` |

### 3.3 — Web3 Components
| Component | File | Description |
|-----------|------|-------------|
| `ConnectButton` | `components/web3/ConnectButton.tsx` | RainbowKit connect button (pink accent) |
| `ConnectToContinue` | `components/web3/ConnectToContinue.tsx` | Gate for wallet-required actions |

---

## Phase 4: Pages & Routes

Use Next.js App Router file-based routing. All pages under `app/` at project root (no `src/`).

### 4.1 — Route Map

```
app/
  layout.tsx              → Root layout with providers
  page.tsx                → / (Home landing page)
  globals.css             → Global styles

  app/
    page.tsx              → /app (Main browse rounds view)

  houses/
    page.tsx              → /houses (All houses listing)
    [address]/
      page.tsx            → /houses/:address (House detail with rounds)

  rounds/
    [address]/
      page.tsx            → /rounds/:address (Round detail with proposals)
      manage/
        page.tsx          → /rounds/:address/manage (Round manager/admin)

  proposals/
    [id]/
      page.tsx            → /proposals/:id (Proposal detail + voting)

  create/
    round/
      page.tsx            → /create/round (Create new round, multi-step wizard)
    proposal/
      page.tsx            → /create/proposal (Create new proposal, rich editor)

  dashboard/
    page.tsx              → /dashboard (User dashboard: my proposals, votes)

  api/
    houses/
      route.ts            → GET/POST /api/houses
      [id]/
        route.ts          → GET/PATCH /api/houses/:id
    rounds/
      route.ts            → GET /api/rounds, POST /api/rounds
      [id]/
        route.ts          → GET/PATCH /api/rounds/:id
        proposals/
          route.ts        → GET /api/rounds/:id/proposals
    proposals/
      route.ts            → GET/POST /api/proposals
      [id]/
        route.ts          → GET/PATCH/DELETE /api/proposals/:id
    votes/
      route.ts            → POST /api/votes
    files/
      route.ts            → POST /api/files (IPFS upload)
    stats/
      route.ts            → GET /api/stats (platform stats)
    replies/
      route.ts            → GET/POST /api/replies (Supabase-powered)
```

### 4.2 — Page Implementations (in order)

**4.2a — Home Page `/`**
- Hero section with gradient background (replicate `homeGradientBg` as Tailwind)
- "Prop House" title in Londrina Solid
- Browse active rounds section
- Stats strip (total funded, # houses, # proposals)
- CTA to create a round

**4.2b — Browse Page `/app`**
- Search/filter bar with round state filter
- Grid of RoundCards filtered to "accepting proposals"
- Infinite scroll via `useIntersectionObserver`
- "Featured rounds" section at top

**4.2c — Houses Page `/houses`**
- Grid of HouseCards
- Search by name
- Sort by # rounds, recently active

**4.2d — House Detail `/houses/:address`**
- HouseHeader with profile image, name, description, stats
- HouseTabBar switching between "Rounds" and "Proposals"
- Grid of RoundCards under rounds tab
- HouseUtilityBar with "Create Round" button (if authorized)

**4.2e — Round Detail `/rounds/:address`**
- RoundHeader with status pill, title, dates, funding info
- RoundContent with modules based on state:
  - ACCEPTING_PROPOSALS → proposal submission module
  - VOTING → proposal list + voting controls
  - COMPLETED → winner display
  - CANCELLED → cancelled notice
- Proposal grid/list sorted by vote count
- CTA to create proposal (if accepting proposals)

**4.2f — Proposal Detail `/proposals/:id`**
- ProposalContent with markdown rendering
- Voting module (if round is in voting phase)
- Comments/replies section (Supabase-powered)
- Proposal author info (address, avatar)
- Vote count display

**4.2g — Create Round `/create/round`**
- Multi-step wizard (`CreateRoundStep` components)
- Step 1: Round type (Timed vs Infinite)
- Step 2: Title, description, funding amount, currency
- Step 3: Dates (start, proposal end, voting end) / quorum params
- Step 4: Strategies (who can propose, who can vote)
- Step 5: Review & submit
- Wizard state managed via React `useReducer` hook (no Redux)
- On-chain interaction via `@prophouse/sdk-react`

**4.2h — Create Proposal `/create/proposal`**
- ProposalEditor (react-quill rich text)
- Title, TL;DR, full body fields
- Optional funding request amount (for infinite rounds)
- File upload (image drag-and-drop, IPFS upload)
- Preview step
- Sign + submit (EIP-712 typed signature, matching legacy `Signable` flow)
- UI state via React `useState` / `useReducer`

**4.2i — Dashboard `/dashboard`**
- "My Proposals" list (fetched via `useAccount` + API calls)
- "My Votes" history (with proposal links)
- Activity feed
- Stats summary
- Data fetched via wagmi `useAccount()` for address + SWR/React Query for API data

**4.2j — Round Manager `/rounds/:address/manage`**
- Admin controls: cancel round, edit round params
- Deposit asset widgets (ETH, ERC20, ERC721, ERC1155)
- Reclaim awards widget
- Only accessible by round creator (checked via SDK + signature verification)

---

## Phase 5: State Management & Hooks

**NO Redux. No Redux Toolkit.** All state managed through:
- **wagmi v2 hooks** for Web3 state (account, chain, balance, contract reads/writes)
- **React hooks (`useState`, `useReducer`, `useContext`)** for UI state
- **`useSWR` or React Query** for server-state caching and revalidation
- **React Context** sparingly for truly global UI state (e.g., active modal, theme)

### 5.1 — UI State (where needed)

Instead of Redux slices, use lightweight React patterns:

| Legacy Redux Slice | Replacement |
|---------------------|-------------|
| `propHouse` (activeRound, activeHouse, etc.) | Wagmi SDK hooks + React Context for modal state |
| `round` (wizard form state) | `useReducer` in the CreateRound page |
| `voting` (vote allotments) | `useState` + `useReducer` local to voting component |
| `editor` (draft content) | `useState` local to ProposalEditor |
| `backend` (API URL) | Environment variable (`NEXT_PUBLIC_API_URL`) |
| `configuration` (env flags) | Environment variables |

### 5.2 — Hooks (in `hooks/` at project root)

| Hook | Purpose |
|------|---------|
| `useHouse(contractAddress)` | Fetch house by contract address |
| `useRounds(houseId)` | Fetch rounds for a house |
| `useRound(roundAddress)` | Fetch single round by address |
| `useProposals(roundId)` | Fetch proposals for a round |
| `useProposal(id)` | Fetch single proposal |
| `useVotingPower(address, roundAddress)` | Fetch voting power for user in round |
| `useCanPropose(address, roundAddress)` | Check if user can propose in round |
| `useFeaturedRounds()` | Fetch featured rounds for homepage |
| `useCreateRound()` | Create round mutation |
| `useCreateProposal()` | Create proposal mutation |
| `useSubmitVotes()` | Submit votes mutation |
| `useRoundBalances(roundId)` | Fetch round token balances |
| `useAssetMetadata()` | Fetch ERC20/ERC721/ERC1155 metadata |
| `useReplies(proposalId)` | Fetch and post replies (Supabase) |

---

## Phase 6: API Routes

### 6.1 — REST API Design

All routes under `app/api/`. Use Next.js Route Handlers.

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/houses` | List all houses |
| `GET` | `/api/houses/[id]` | Get single house with rounds |
| `GET` | `/api/houses/contract/[address]` | Get house by contract address |
| `POST` | `/api/houses` | Create house (admin) |
| `GET` | `/api/rounds` | List rounds (with filters: state, houseId) |
| `GET` | `/api/rounds/[id]` | Get single round with proposals |
| `GET` | `/api/rounds/address/[address]` | Get round by contract address |
| `POST` | `/api/rounds` | Create round |
| `PATCH` | `/api/rounds/[id]` | Update round |
| `GET` | `/api/rounds/[id]/proposals` | Get proposals for a round |
| `GET` | `/api/proposals` | List proposals (paginated) |
| `GET` | `/api/proposals/[id]` | Get single proposal with votes |
| `POST` | `/api/proposals` | Create proposal (with EIP-712 sig verification) |
| `PATCH` | `/api/proposals/[id]` | Update proposal |
| `DELETE` | `/api/proposals/[id]` | Soft-delete proposal |
| `POST` | `/api/votes` | Submit vote (with EIP-712 sig verification) |
| `GET` | `/api/votes` | Get votes (with filters) |
| `GET` | `/api/stats` | Platform stats (total funded, # houses, etc.) |
| `POST` | `/api/files` | Upload file to IPFS |
| `GET` | `/api/replies` | Fetch replies for a proposal |

### 6.2 — EIP-712 Signature Verification
- Port the `signed.ts` / `ecdsa-signed.pipe.ts` verification logic from legacy backend
- Use `viem` utilities (`verifyTypedData`, `hashTypedData`) instead of ethers
- Verify messageTypes match expected schemas
- Reject invalid signatures with 401

### 6.3 — IPFS File Upload
- `POST /api/files` — upload image to IPFS (via Pinata or similar)
- Keep the `File` table in Prisma matching legacy `StoredFile`

---

## Phase 7: Web3 Integration Layer

### 7.1 — Wallet Connection
- RainbowKit with `lightTheme({ accentColor: '#8a2be2' })` (brand purple)
- wagmi v2 configuration in `lib/wagmi.ts`:
  - `createConfig` with `http()` transport
  - Mainnet only (match legacy), with easy extension point for L2
  - `WagmiProvider`, `RainbowKitProvider`, `QueryClientProvider` in `app/providers.tsx`

### 7.2 — On-Chain Data via @prophouse/sdk-react
- Keep using `@prophouse/sdk-react` for:
  - `House`, `Round`, `Proposal` entity types (on-chain data)
  - Contract interaction hooks
- Bridge on-chain data with off-chain DB data:
  - Houses/Rounds exist on both chain and DB
  - Proposals/votes exist on both chain and DB
  - Merge on-chain state with DB-augmented data in React hooks

### 7.3 — Transaction Flows

| Flow | On-Chain | Off-Chain |
|------|----------|-----------|
| Create House | Deploy contract | Store metadata in DB |
| Create Round | Deploy round contract | Store metadata in DB |
| Create Proposal | EIP-712 signature | Store in DB → emit to chain |
| Vote | EIP-712 signature | Store in DB → emit to chain |
| Claim Award | Contract interaction | Update DB status |

---

## Phase 8: Supabase Integration (Comments/Replies)

- Keep Supabase for replies (matches legacy architecture, avoids schema complexity)
- `POST /api/replies` → triggers Supabase edge function with signed payload
- `GET /api/replies?proposalId=X` → query Supabase `reply` table
- Same `ReplyMessageTypes` EIP-712 signing pattern as legacy
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_KEY`

---

## Phase 9: Final Integration & Polish

### 9.1 — OpenGraph Card Generation
- Port `OpenGraphHouseCard`, `OpenGraphRoundCard`, `OpenGraphProposalCard`
- Use Next.js `generateMetadata()` + `ImageResponse` for dynamic OG images
- Dedicated OG image routes in `app/og/`

### 9.2 — SEO & Metadata
- Dynamic `metadata` export per page via `generateMetadata()`
- OpenGraph tags, Twitter card tags
- Canonical URLs

### 9.3 — Analytics
- Mixpanel (optional, keep if needed — env flag)

### 9.4 — Removed Legacy Debt (Do NOT Port)
- `Redux Toolkit` / `@reduxjs/toolkit` / `react-redux` — **NOT INCLUDED**
- `ForceOpenInNewTab` (janky workaround)
- `MakeAppHomePageButton` / localStorage `showMakeAppHomePage` toggle
- `DevEnvDropdown` (debug tool)
- `i18n.js`, `LocaleSwitcher`, language JSON files, `crowdin-cli`
- `@usedapp/core` (replaced by wagmi v2)
- `craco.config.js` (CRA-specific)
- `quill.css`, `quill-blot-formatter` (replaced by modern editor)
- `react-infinite-scroll-component` (use IntersectionObserver)
- `react-datetime` (use native datetime inputs or modern date picker)
- `bootstrap` / `react-bootstrap` (replaced by Tailwind)
- `clsx` (Tailwind handles conditional classes via template literals)
- `yarn.lock` / legacy `package.json` (fresh Next.js project)

---

## Execution Order (Isolated Phases)

| Phase | Deliverable | Depends On |
|-------|-------------|------------|
| **Phase 1** | Prisma schema, DB seeded, Prisma client working | — |
| **Phase 2** | Tailwind theme, global CSS, root layout + providers (wagmi, RainbowKit, no Redux) | Phase 1 |
| **Phase 3** | All shared UI components (~35 components, parallelizable) | Phase 2 |
| **Phase 4** | All pages + routes (10 pages) | Phase 3 |
| **Phase 5** | Custom hooks (15 hooks) | Phase 4 |
| **Phase 6** | API routes (15 routes) | Phase 1 |
| **Phase 7** | wagmi/RainbowKit contract + SDK integration | Phase 4 |
| **Phase 8** | Supabase replies | Phase 4 |
| **Phase 9** | OG cards, SEO, analytics, cleanup | Phase 4-8 |

---

## Key Differences from Legacy

| Concern | Legacy | Rebuild |
|---------|--------|---------|
| **Framework** | CRA (Create React App) | Next.js 14+ App Router |
| **Styling** | Bootstrap 5 + custom CSS | Tailwind CSS |
| **Backend** | Separate NestJS + TypeORM | Next.js API routes + Prisma |
| **State** | Redux Toolkit | React hooks + Context + wagmi |
| **Web3** | wagmi v1 + ethers v5 | wagmi v2 + viem |
| **i18n** | i18next (10+ languages) | English only (dropped) |
| **Schema naming** | `auction`, `community` | `round`, `house` |
| **Directory** | `src/` nesting | Flat root: `app/`, `components/`, etc. |
| **Build tool** | craco | Built-in Next.js bundler (Turbopack) |
| **Font loading** | CSS `@import` + `@font-face` | `next/font` + `@font-face` |

---

## Component Count Summary

| Category | Count |
|----------|-------|
| Primitive UI components | 10 |
| Domain components | ~22 |
| Web3 components | 2 |
| Layout components | 3 |
| Pages | 10 |
| API routes | 15 |
| Custom hooks | 15 |
| **Total** | **~77 files** |
