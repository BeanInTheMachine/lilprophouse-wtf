'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useState } from 'react';
import { post } from '@/lib/api-client';
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

  function handleSelectHouse(house: HouseInfo) {
    updateRound({ house });
  }

  function handleCreate() {
    setIsCreating(true);
    post('/api/rounds', {
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
    })
      .then((data: any) => {
        router.push(`/rounds/${data.id}`);
      })
      .catch((err) => {
        alert(err.message ?? 'Failed to create round');
      })
      .finally(() => {
        setIsCreating(false);
      });
  }

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
            isCreating={isCreating}
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
