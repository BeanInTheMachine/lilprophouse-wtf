# Create Round Rebuild Plan

## Architecture

The original Prop House create round flow uses a **2-column wizard** with 6 progressive steps, Redux state management, and on-chain round deployment via `@prophouse/sdk-react`.

Our rebuild replicates this structure using:
- `useReducer` for wizard state (no Redux)
- Our REST API for house data and round metadata
- wagmi + viem for on-chain deployment (replacing SDK)
- Tailwind CSS for the 2-column layout

## Layout Structure

```
┌──────────────────────────────────────┐
│  Header (bulb logo + connect wallet) │
├──────────────────────────────────────┤
│  House Name & Image (steps 2-6)      │
├──────────────┬───────────────────────┤
│              │  PRIMARY CARD         │
│  STEPS       │  (form content per    │
│  SIDEBAR     │   step)               │
│  (desktop)   │                       │
│  1-6 with    ├───────────────────────┤
│  labels      │  FOOTER:              │
│              │  Back / Next / Create │
└──────────────┴───────────────────────┘
```

## Step Execution Order

### Step 1: Wizard State Hook
**File:** `lib/hooks/useWizardState.ts`

A `useReducer`-based hook managing the round creation wizard state.

**State shape:**
```ts
{
  activeStep: number,           // 1-6
  stepDisabled: boolean[],      // [true, true, true, true, true, true]
  round: {
    house: { id, address, name, image, existingHouse },
    title: string,
    description: string,
    voters: GovPowerStrategy[],
    awards: EditableAsset[],
    numWinners: number,
    currencyType: string,
    roundType: 'TIMED' | 'INFINITE',
    proposalPeriodStartTimestamp: number,
    proposalPeriodDurationSecs: number,
    votePeriodDurationSecs: number,
    quorumFor: number | null,
    quorumAgainst: number | null,
    votingPeriod: number | null,
  }
}
```

**Actions:** `SET_STEP`, `NEXT_STEP`, `PREV_STEP`, `UPDATE_ROUND`, `VALIDATE_STEP`

**Validation rules:**
- Step 1: house.address !== '' → valid, auto-advance to step 2
- Step 2: title.length > 0 → valid
- Step 3: voters.length > 0 → valid
- Step 4: awards.every(a => a.state === 'saved') && numWinners > 0 → valid
- Step 5: proposalPeriodStartTimestamp > 0 → valid
- Step 6: always valid (review only)

**Edge case:** Step 1 auto-advances when `existingHouse` is true and a house is selected (matching legacy behavior).

### Step 2: Step Sidebar
**File:** `components/round-wizard/StepSidebar.tsx`

Desktop-only vertical step indicators. Pure presentational — receives `activeStep` as prop.

**6 steps:**
| # | Label |
|---|-------|
| 1 | Select the house |
| 2 | Name the round |
| 3 | Set who can participate |
| 4 | Set the awards |
| 5 | Round timing |
| 6 | Create the round |

**States per step:**
- **Active** (current): purple left border, bold text, dark background tint
- **Completed** (past): gray, checkmark icon, clickable (allows going back)
- **Future**: lighter gray, muted

Contains a vertical dotted line connecting steps (matching legacy).

**Props:** `{ activeStep: number, onStepClick?: (step: number) => void }`

### Step 3: Wizard Footer
**File:** `components/round-wizard/WizardFooter.tsx`

Bottom navigation bar for the wizard. Renders different buttons based on current step.

**Layout:**
- Steps 1-2: Next button only (right-aligned)
- Steps 3-6: Back (left) + Next/Create (right)

**Buttons:**
| Step | Left | Right |
|------|------|-------|
| 1-2 | — | Next (pink, disabled until valid) |
| 3-5 | Back (black) | Next (pink, disabled until valid) |
| 6 | Back (black) | Create Round (pink) |

On step 6, a disclaimer text appears below: "Rounds are final and cannot be edited once created."

**Props:** `{ activeStep, stepDisabled, onBack, onNext, onCreate, isCreating }`

### Step 4: House Selection (Step 1)
**File:** `components/round-wizard/steps/HouseStep.tsx`

Select an existing house or create a new one. Matches legacy `HouseInfoConfig` + `HouseSelection`.

**If no account connected:** Renders `ConnectToContinue`.

**Existing house view:**
- Fetches houses from `GET /api/houses`
- Displays clickable cards: house image (or initial), name, description, round count
- On click: sets house in wizard state, auto-advances to step 2 (matching legacy `checkStepCriteria`)

**New house view (when "Create a new house" clicked):**
- Simple form: name, description, image URL
- "Back" option to return to house selection
- On submit: posts to `POST /api/houses`, sets in wizard state, auto-advances to step 2

**Edge cases:**
- Loading state while fetching houses
- Empty state when user owns no houses (shows "Create new" prompt)
- Error state if API call fails

### Step 5: Round Info (Step 2)  
**File:** `components/round-wizard/steps/RoundInfoStep.tsx`

Title and description form. Matches legacy `RoundInfoConfig` + `RoundFields`.

**Fields:**
- Title input (required, 128 char max)
- Description textarea (markdown preview, 1000 char max)

**IPFS upload:** On mount, if house is new and has no contractURI, uploads house metadata JSON to IPFS via `POST /api/files`.

**Props:** `{ round, onUpdate }`

### Step 6: Voters Config (Step 3)
**File:** `components/round-wizard/steps/VotersStep.tsx`

Define voting strategies. Matches legacy `VotersConfig`. This is the most complex step.

**Strategy types:**
- Token Holders (any ERC-20/721/1155): address + multiplier
- Allowlist (manual + CSV upload): addresses + vote power per address

**Components:**
- "Add a voter" button → opens `VotersModal` (strategy type selector + address input)
- "Upload CSV" button → opens `UploadCSVModal` (CSV with address, votes columns)
- Voter cards: show address (truncated), type, multiplier, remove button
- "Show X more voters" link when > 10 voters
- CSV parsing: validates addresses with `viem.isAddress`, deduplicates

**Validation:** At least 1 voter configured.

**Props:** `{ voters, onUpdate }`

### Step 7: Awards Config (Step 4)
**File:** `components/round-wizard/steps/AwardsStep.tsx`

Define winner count and awards. Matches legacy `AwardsConfig`.

**Fields:**
- Number of winners (1-10)
- Per-winner award configuration:
  - Asset type: ETH / ERC-20 / ERC-721 / ERC-1155
  - Token address (empty for ETH)
  - Amount / token ID
  - Asset name & symbol (fetched from on-chain via `useAssetMetadata`)

**Components:**
- Add/remove award slots
- Each slot: type selector, address input, amount input
- Asset preview: shows token symbol and name once address is entered

**Edge case:** If 1 winner but N awards, all awards go to the single winner. If N winners, each gets their own award.

**Props:** `{ awards, numWinners, onUpdate }`

### Step 8: Dates Config (Step 5)
**File:** `components/round-wizard/steps/DatesStep.tsx`

Set round timing. Matches legacy `DatesConfig`.

**Round type toggle:** Timed / Continuous (radio buttons)

**Timed fields:**
- Start date (datetime picker, must be in future)
- Proposal period duration (days, 1-90)
- Vote period duration (days, 1-30)

**Continuous fields:**
- Start date (datetime picker)
- Quorum for (number of votes needed to pass)
- Quorum against (number of votes to reject)
- Voting period (days per proposal)

**Computed display:** Shows calculated end dates based on inputs.

**Props:** `{ round, onUpdate }`

### Step 9: Review & Deploy (Step 6)
**File:** `components/round-wizard/steps/ReviewStep.tsx`

Final review before on-chain deployment. Matches legacy `CreateRound` component.

**Summary sections (each editable via modal):**
1. **Dates** — start/end with timeline bar
2. **Title & Description** — truncated with "Read more"
3. **Voters** — scrollable voter cards
4. **Awards** — winner cards with assets

**Edit modals:**
- `EditDatesModal` — inline dates editor
- `EditRoundInfoModal` — title + description editor
- `EditVotersModal` — voters manager
- `EditAwardsModal` — awards manager

**Deployment flow:**
1. User clicks "Create Round" (in Footer)
2. If house exists: deploys round contract via wagmi `useWriteContract`
3. If new house: deploys house contract first, then round
4. Stores round metadata via `POST /api/rounds`
5. Shows `CreateRoundModal` with tx status (pending → success → link to new round)
6. On error: shows error modal with message

**Props:** `{ round, onBack }`

### Step 10: Assembly
**File:** `app/create/round/page.tsx` (rewrite)

**Layout:**
```tsx
<ConnectToContinue>
  <div className="container mx-auto px-4 py-8">
    <div className="flex gap-8">
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <StepSidebar activeStep={activeStep} />
      </aside>
      <main className="flex-1 min-w-0">
        <Card>{renderStep()}</Card>
      </main>
    </div>
    <WizardFooter ... />
  </div>
</ConnectToContinue>
```

**Mobile:** Step sidebar collapses; step content takes full width.

## Acceptance Criteria

1. User must connect wallet to access any step
2. Step 1 auto-advances when selecting an existing house
3. Next button disabled until current step is valid
4. Back button returns to previous step (preserving data)
5. CSV upload validates addresses and deduplicates
6. Step 6 shows comprehensive review with edit modals
7. "Create Round" triggers on-chain deployment
8. Mobile-responsive 2-column layout collapses to single column

## Files to Create

| # | File | Type |
|---|------|------|
| 1 | `lib/hooks/useWizardState.ts` | Hook |
| 2 | `components/round-wizard/StepSidebar.tsx` | Component |
| 3 | `components/round-wizard/WizardFooter.tsx` | Component |
| 4 | `components/round-wizard/steps/HouseStep.tsx` | Component |
| 5 | `components/round-wizard/steps/RoundInfoStep.tsx` | Component |
| 6 | `components/round-wizard/steps/VotersStep.tsx` | Component |
| 7 | `components/round-wizard/steps/AwardsStep.tsx` | Component |
| 8 | `components/round-wizard/steps/DatesStep.tsx` | Component |
| 9 | `components/round-wizard/steps/ReviewStep.tsx` | Component |
| 10 | `app/create/round/page.tsx` | Page (rewrite) |

**Total: 10 files**
