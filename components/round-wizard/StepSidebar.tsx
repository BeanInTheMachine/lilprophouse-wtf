'use client';

interface StepSidebarProps {
  activeStep: number;
  onStepClick?: (step: number) => void;
}

const STEPS = [
  { label: 'Select the house', detail: 'Set the name and description' },
  { label: 'Name the round', detail: 'Set the name and description' },
  { label: 'Set who can participate', detail: 'Define who can vote in your round' },
  { label: 'Set the awards', detail: 'Define number of winners and awards' },
  { label: 'Round timing', detail: 'Set how long the round should be' },
  { label: 'Create the round', detail: 'Review the round settings and create it' },
] as const;

export default function StepSidebar({ activeStep, onStepClick }: StepSidebarProps) {
  return (
    <div className="flex flex-col gap-0">
      {STEPS.map((step, idx) => {
        const stepNum = idx + 1;
        const isActive = stepNum === activeStep;
        const isCompleted = stepNum < activeStep;
        const isClickable = isCompleted && onStepClick;

        return (
          <div key={stepNum} className="flex gap-3">
            <div className="flex flex-col items-center">
              <button
                onClick={isClickable ? () => onStepClick(stepNum) : undefined}
                disabled={!isClickable}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                  isActive
                    ? 'bg-brand-purple text-white border-brand-purple'
                    : isCompleted
                    ? 'bg-brand-purple-semi-transparent text-brand-purple border-brand-purple-semi-transparent cursor-pointer'
                    : 'bg-transparent text-brand-gray border-border-med'
                }`}
              >
                {isCompleted ? '✓' : stepNum}
              </button>
              {idx < STEPS.length - 1 && (
                <div
                  className={`w-0.5 flex-1 min-h-[24px] my-1 ${
                    stepNum < activeStep ? 'bg-brand-purple' : 'bg-border-light'
                  }`}
                />
              )}
            </div>
            <div className={`pb-6 ${!isActive && !isCompleted ? 'opacity-50' : ''}`}>
              <p
                className={`text-sm font-bold mb-0.5 ${
                  isActive ? 'text-brand-black' : 'text-brand-gray'
                }`}
              >
                {step.label}
              </p>
              <p className="text-xs text-brand-gray">{step.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
