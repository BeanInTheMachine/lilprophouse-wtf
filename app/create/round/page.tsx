'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAccount, useSignTypedData, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useEffect, useRef } from 'react';
import { post } from '@/lib/api-client';
import { DOMAIN_SEPARATOR, PROPOSAL_MESSAGE_TYPES } from '@/lib/eip712';
import { useCreateRoundOnChain, type AwardConfig } from '@/lib/hooks/useOnChain';
import { buildMerkleTree } from '@/lib/merkle';
import Card from '@/components/ui/Card';
import ConnectToContinue from '@/components/web3/ConnectToContinue';
import StepSidebar from '@/components/round-wizard/StepSidebar';
import WizardFooter from '@/components/round-wizard/WizardFooter';
import HouseStep from '@/components/round-wizard/steps/HouseStep';
import RoundInfoStep from '@/components/round-wizard/steps/RoundInfoStep';
import VotersStep from '@/components/round-wizard/steps/VotersStep';
import AwardsStep from '@/components/round-wizard/steps/AwardsStep';
import DatesStep from '@/components/round-wizard/steps/DatesStep';
import ReviewStep from '@/components/round-wizard/steps/ReviewStep';
import { useWizardState, type HouseInfo, type GovPowerStrategy, type RoundWizardState } from '@/lib/hooks/useWizardState';
import { type Address } from 'viem';

const STRATEGY_ENUM: Record<string, number> = {
  BALANCE_OF: 0,
  BALANCE_OF_ERC721: 0,
  BALANCE_OF_ERC20: 1,
  BALANCE_OF_ERC1155: 2,
  ALLOWLIST: 3,
};

function buildVotingParams(voters: GovPowerStrategy[]) {
  if (voters.length === 0) {
    return {
      voteStrategyType: 0,
      votingToken: '0x0000000000000000000000000000000000000000',
      votingTokenId: 0n,
      voteMultiplier: 1n,
      allowlistRoot: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
    };
  }

  const allowlistVoter = voters.find((v) => v.strategyType === 'ALLOWLIST');
  if (allowlistVoter && allowlistVoter.members && allowlistVoter.members.length > 0) {
    const members = allowlistVoter.members.map((m) => ({
      address: m.address,
      weight: m.govPower,
    }));
    const tree = buildMerkleTree(members);
    return {
      voteStrategyType: 3,
      votingToken: '0x0000000000000000000000000000000000000000',
      votingTokenId: 0n,
      voteMultiplier: 1n,
      allowlistRoot: tree.root,
    };
  }

  const tokenVoter = voters.find((v) =>
    v.strategyType !== 'ALLOWLIST' && v.address
  );
  if (tokenVoter) {
    return {
      voteStrategyType: STRATEGY_ENUM[tokenVoter.strategyType] ?? 0,
      votingToken: tokenVoter.address,
      votingTokenId: tokenVoter.tokenId ? BigInt(tokenVoter.tokenId) : 0n,
      voteMultiplier: BigInt(tokenVoter.multiplier || 1),
      allowlistRoot: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
    };
  }

  return {
    voteStrategyType: 0,
    votingToken: '0x0000000000000000000000000000000000000000',
    votingTokenId: 0n,
    voteMultiplier: 1n,
    allowlistRoot: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
  };
}

const ASSET_TYPE_MAP: Record<string, number> = { ETH: 0, ERC20: 1, ERC721: 2, ERC1155: 3 };

function buildAwardConfigs(awards: RoundWizardState['round']['awards'], numWinners: number): AwardConfig[] {
  const saved = awards.filter((a) => a.state === 'saved');
  if (saved.length === 0) return [];

  return saved.slice(0, numWinners).map((a) => {
    const assetType = ASSET_TYPE_MAP[a.type] ?? 0;
    if (a.type === 'ETH') {
      return {
        assetType,
        tokenAddress: '0x0000000000000000000000000000000000000000',
        tokenId: 0n,
        amountPerWinner: BigInt(Math.floor((a.allocated || 0) * 1e18)),
      };
    }
    if (a.type === 'ERC20') {
      return {
        assetType,
        tokenAddress: a.address,
        tokenId: 0n,
        amountPerWinner: BigInt(Math.floor((a.allocated || 0) * 1e18)),
      };
    }
    if (a.type === 'ERC721') {
      return {
        assetType,
        tokenAddress: a.address,
        tokenId: a.tokenId ? BigInt(a.tokenId) : 0n,
        amountPerWinner: 0n,
      };
    }
    return {
      assetType,
      tokenAddress: a.address,
      tokenId: a.tokenId ? BigInt(a.tokenId) : 0n,
      amountPerWinner: BigInt(a.allocated || 1),
    };
  });
}

export default function CreateRoundPage() {
  const router = useRouter();
  const { address } = useAccount();
  const {
    activeStep,
    stepDisabled,
    round,
    setStep,
    nextStep,
    prevStep,
    updateRound,
  } = useWizardState();

  const [isCreating, setIsCreating] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const hasStored = useRef(false);
  const { signTypedDataAsync } = useSignTypedData();
  const { createRound, isPending: isDeploying } = useCreateRoundOnChain();
  const { data: receipt } = useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  const devMinutes = process.env.NEXT_PUBLIC_DEV_DURATION_MINUTES;
  const devDuration = devMinutes ? parseInt(devMinutes) * 60 : null;

  function handleSelectHouse(house: HouseInfo) {
    updateRound({ house });
  }

  async function handleCreate() {
    if (!address) return;
    setIsCreating(true);

    try {
      if (process.env.NEXT_PUBLIC_SKIP_ONCHAIN === 'true') {
        await storeRoundInDb();
        return;
      }

      const { voteStrategyType, votingToken, votingTokenId, voteMultiplier, allowlistRoot } =
        buildVotingParams(round.voters);
      const awardConfigs = buildAwardConfigs(round.awards, round.numWinners);

      try {
        const hash = await createRound(
          address,
          round.house.id,
          round.title,
          round.description || '',
          round.numWinners,
          devDuration ?? round.proposalPeriodDurationSecs,
          devDuration ?? round.votePeriodDurationSecs,
          voteStrategyType,
          votingToken,
          votingTokenId,
          voteMultiplier,
          allowlistRoot,
          awardConfigs.slice(0, round.numWinners),
        );
        setTxHash(hash);
      } catch (deployErr: any) {
        if (deployErr.message?.includes('chain')) {
          await storeRoundInDb();
          return;
        }
        throw deployErr;
      }
    } catch (err: any) {
      if (err.message?.includes('rejected') || err.message?.includes('denied')) {
        setIsCreating(false);
        return;
      }
      alert(err.message ?? 'Failed to deploy round');
      setIsCreating(false);
    }
  }

  async function storeRoundInDb(contractAddress?: string) {
    if (!address || hasStored.current) return;
    hasStored.current = true;

    const payload = {
      title: round.title,
      what: round.description || '',
      tldr: `Timed round · ${round.numWinners} winner${round.numWinners !== 1 ? 's' : ''}`,
      parentAuctionId: round.house.id,
      parentType: 'auction',
    };

    const signedMessageString = JSON.stringify(payload);

    const signature = await signTypedDataAsync({
      domain: DOMAIN_SEPARATOR,
      types: PROPOSAL_MESSAGE_TYPES,
      primaryType: 'Proposal',
      message: payload,
    });

    const signedData = {
      message: Buffer.from(signedMessageString).toString('base64'),
      signature,
      signer: address,
    };

    const data = await post<any>('/api/rounds', {
      type: round.roundType,
      title: round.title,
      description: round.description || null,
      fundingAmount: round.awards[0]?.allocated ?? 0,
      currencyType: round.awards[0]?.type === 'ETH' ? 'ETH' : (round.awards[0]?.symbol ?? 'ETH'),
      numWinners: round.numWinners,
      startTime: new Date(round.proposalPeriodStartUnixTimestamp * 1000).toISOString(),
      proposalEndTime: (devDuration ?? round.proposalPeriodDurationSecs) > 0
        ? new Date((round.proposalPeriodStartUnixTimestamp + (devDuration ?? round.proposalPeriodDurationSecs)) * 1000).toISOString()
        : null,
      votingEndTime: (devDuration ?? round.votePeriodDurationSecs) > 0
        ? new Date((round.proposalPeriodStartUnixTimestamp + (devDuration ?? round.proposalPeriodDurationSecs) + (devDuration ?? round.votePeriodDurationSecs)) * 1000).toISOString()
        : null,
      houseId: round.house.id,
      propStrategy: { type: 'custom', voters: round.voters },
      voteStrategy: { type: 'custom', voters: round.voters },
      contractAddress: contractAddress ?? null,
      address,
      signedData,
      messageTypes: PROPOSAL_MESSAGE_TYPES,
      domainSeparator: DOMAIN_SEPARATOR,
    });

    router.push(`/rounds/${data.id}`);
  }

  // When tx is confirmed (and not skipped), store metadata in DB and navigate
  useEffect(() => {
    if (!receipt || !txHash || !address || hasStored.current || process.env.NEXT_PUBLIC_SKIP_ONCHAIN === 'true') return;

    const contractAddress = receipt.contractAddress ?? undefined;
    storeRoundInDb(contractAddress).catch((err) => {
      alert(err.message ?? 'Failed to store round');
      setIsCreating(false);
      hasStored.current = false;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt]);

  function renderStep() {
    switch (activeStep) {
      case 1:
        return <HouseStep onSelectHouse={handleSelectHouse} />;
      case 2:
        return (
          <RoundInfoStep
            title={round.title}
            description={round.description}
            onUpdate={(p) => updateRound(p)}
          />
        );
      case 3:
        return (
          <VotersStep
            voters={round.voters}
            onUpdate={(p) => updateRound(p)}
          />
        );
      case 4:
        return (
          <AwardsStep
            awards={round.awards.length ? round.awards : [{ type: 'ETH', address: '', total: 0, allocated: 0, state: 'input' }]}
            onUpdate={(p) => updateRound(p)}
          />
        );
      case 5:
        return (
          <DatesStep
            proposalPeriodStartUnixTimestamp={round.proposalPeriodStartUnixTimestamp}
            proposalPeriodDurationSecs={round.proposalPeriodDurationSecs}
            votePeriodDurationSecs={round.votePeriodDurationSecs}
            onUpdate={(p) => updateRound(p)}
          />
        );
      case 6:
        return (
          <ReviewStep
            round={round}
            onUpdate={updateRound}
            onCreate={handleCreate}
            isCreating={isDeploying || !!txHash}
          />
        );
      default:
        return null;
    }
  }

  const showSidebarTitle = activeStep > 1 && round.house.name;

  return (
    <ConnectToContinue>
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/app"
          className="inline-flex items-center text-sm font-medium text-brand-gray hover:text-brand-black mb-6 transition-colors"
        >
          &larr; Browse rounds
        </Link>

        <div className="flex gap-8 lg:flex-row flex-col">
          <aside className="hidden lg:block w-64 flex-shrink-0">
            {showSidebarTitle && (
              <div className="flex items-center gap-3 mb-6">
                {round.house.image ? (
                  <img src={round.house.image} alt={round.house.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand-purple-hint flex items-center justify-center text-brand-purple font-londrina text-lg">
                    {round.house.name.charAt(0)}
                  </div>
                )}
                <p className="font-bold text-sm text-brand-black truncate">{round.house.name}</p>
              </div>
            )}
            <StepSidebar
              activeStep={activeStep}
              onStepClick={(step) => setStep(step)}
            />
          </aside>

          <main className="flex-1 min-w-0">
            <Card className="p-6">
              {renderStep()}
            </Card>

            {activeStep !== 6 && (
              <WizardFooter
                activeStep={activeStep}
                stepDisabled={stepDisabled}
                onBack={prevStep}
                onNext={nextStep}
                onCreate={handleCreate}
                isCreating={isCreating}
              />
            )}
          </main>
        </div>
      </div>
    </ConnectToContinue>
  );
}
