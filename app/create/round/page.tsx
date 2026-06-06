'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAccount, useSignTypedData, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useEffect } from 'react';
import { post } from '@/lib/api-client';
import { DOMAIN_SEPARATOR, PROPOSAL_MESSAGE_TYPES } from '@/lib/eip712';
import { useCreateRoundOnChain } from '@/lib/hooks/useOnChain';
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
import { useWizardState, type HouseInfo } from '@/lib/hooks/useWizardState';

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
  const { signTypedDataAsync } = useSignTypedData();
  const { createRound, isPending: isDeploying } = useCreateRoundOnChain();
  const { data: receipt } = useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  function handleSelectHouse(house: HouseInfo) {
    updateRound({ house });
  }

  async function handleCreate() {
    if (!address) return;
    setIsCreating(true);

    try {
      // Deploy round on-chain (or skip if NEXT_PUBLIC_SKIP_ONCHAIN=true)
      const hash = await createRound(
        address,
        round.house.id,
        round.title,
        round.description || '',
        round.numWinners,
      );
      setTxHash(hash);

      // If skipping on-chain, store directly without waiting for receipt
      if (process.env.NEXT_PUBLIC_SKIP_ONCHAIN === 'true') {
        await storeRoundInDb();
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

  async function storeRoundInDb() {
    if (!address) return;

    const payload = {
      title: round.title,
      what: round.description || '',
      tldr: `${round.roundType} round · ${round.numWinners} winner${round.numWinners !== 1 ? 's' : ''}`,
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
      proposalEndTime: round.proposalPeriodDurationSecs > 0
        ? new Date((round.proposalPeriodStartUnixTimestamp + round.proposalPeriodDurationSecs) * 1000).toISOString()
        : null,
      votingEndTime: round.votePeriodDurationSecs > 0
        ? new Date((round.proposalPeriodStartUnixTimestamp + round.proposalPeriodDurationSecs + round.votePeriodDurationSecs) * 1000).toISOString()
        : null,
      houseId: round.house.id,
      propStrategy: { type: 'custom', voters: round.voters },
      voteStrategy: { type: 'custom', voters: round.voters },
      quorumFor: round.quorumFor,
      quorumAgainst: round.quorumAgainst,
      votingPeriod: round.votingPeriod,
      address,
      signedData,
      messageTypes: PROPOSAL_MESSAGE_TYPES,
      domainSeparator: DOMAIN_SEPARATOR,
    });

    router.push(`/rounds/${data.id}`);
  }

  // When tx is confirmed (and not skipped), store metadata in DB and navigate
  useEffect(() => {
    if (!receipt || !txHash || !address || process.env.NEXT_PUBLIC_SKIP_ONCHAIN === 'true') return;

    storeRoundInDb().catch((err) => {
      alert(err.message ?? 'Failed to store round');
      setIsCreating(false);
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
            roundType={round.roundType}
            proposalPeriodStartUnixTimestamp={round.proposalPeriodStartUnixTimestamp}
            proposalPeriodDurationSecs={round.proposalPeriodDurationSecs}
            votePeriodDurationSecs={round.votePeriodDurationSecs}
            quorumFor={round.quorumFor}
            quorumAgainst={round.quorumAgainst}
            votingPeriod={round.votingPeriod}
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
