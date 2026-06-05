'use client';

import Button from '@/components/ui/Button';
import Divider from '@/components/ui/Divider';

interface WizardFooterProps {
  activeStep: number;
  stepDisabled: boolean[];
  onBack: () => void;
  onNext: () => void;
  onCreate: () => void;
  isCreating: boolean;
}

export default function WizardFooter({
  activeStep,
  stepDisabled,
  onBack,
  onNext,
  onCreate,
  isCreating,
}: WizardFooterProps) {
  const isLastStep = activeStep === 6;
  const showBack = activeStep > 2;

  return (
    <div className="mt-6">
      <Divider />

      {isLastStep && (
        <p className="text-xs text-brand-gray leading-relaxed mt-4 mb-4">
          ¹ Rounds are final and cannot be edited once created. They may only be cancelled before
          voting ends.
          <br />
          ² The Prop House team will cover the gas costs associated with creating your round. Once
          created, share the tx with the team to get reimbursed.
        </p>
      )}

      <div className={`flex mt-4 ${showBack ? 'justify-between' : 'justify-end'}`}>
        {showBack && (
          <Button variant="primary" onClick={onBack} className="bg-brand-black hover:opacity-80 border-0">
            Back
          </Button>
        )}

        {isLastStep ? (
          <Button
            onClick={onCreate}
            disabled={isCreating}
            variant="primary"
            className="bg-brand-pink hover:bg-brand-pink-semi-transparent border-0"
          >
            {isCreating ? 'Pending...' : 'Create Round'}
          </Button>
        ) : (
          <Button
            onClick={onNext}
            disabled={stepDisabled[activeStep - 1]}
            variant="primary"
            className="bg-brand-pink hover:bg-brand-pink-semi-transparent border-0 disabled:opacity-50"
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
