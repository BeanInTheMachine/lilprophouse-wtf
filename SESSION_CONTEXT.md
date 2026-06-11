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
- Full 10-step create round wizard with house selection, round info, voters, awards, dates, review
- Wallet-gated create round flow
- EIP-712 signature verification
- All UI components (36 components in `components/`)
- Smart contract integration on Base L2 (7 SC phases done, then 8 Base rebuild phases done)

### Smart Contracts (Base L2)
- **Deployed:** `HouseRegistry` at `0x3b970E7F0Eb569c043B27C52A8259F1DaE99D539` (Base mainnet)
- **Compiled (not deployed separately):** `LilRound` — deployed per-round via the wizard
- On-chain mode: `NEXT_PUBLIC_SKIP_ONCHAIN=false` (currently true for testing)
- Deployer wallet: `0xB875BADbd67c7D5fa2C845ddCE8FE112Fe383309`

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
| Homepage | `app/page.tsx` |
| Global styles | `app/globals.css` |
| Webpack config | `next.config.mjs` |

### Plans (Reference)
- `REBUILD_PLAN.md` — Original 9-phase rebuild plan
- `rounds_rebuild_plan.md` — Create round wizard plan
- `smart_contracts_rebuild.md` — Original PropHouse contract integration plan (superseded)
- `base_rebuild_plan.md` — Base L2 migration plan (current architecture)

## Known Issues
1. **RainbowKit React 19 warning:** `border=0` inline style error in connect modal. Only in dev mode — production builds don't show it. Known RainbowKit v2.2.11 incompatibility. Wait for RainbowKit to ship React 19 fix.
2. **Chain ID mismatch on round deploy:** Fixed via `useChainId` + `switchChain` in hooks. If error persists, ensure MetaMask is on Base network.
3. **WS module error:** Fixed via webpack fallbacks (`ws: false` in `next.config.mjs`).

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
