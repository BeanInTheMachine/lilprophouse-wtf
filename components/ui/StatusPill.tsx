import type { RoundState } from '@prisma/client';

interface StatusPillProps {
  state: RoundState;
  className?: string;
}

const stateConfig: Record<RoundState, { label: string; bg: string; text: string }> = {
  NOT_STARTED: {
    label: 'Upcoming',
    bg: 'bg-border-light',
    text: 'text-brand-gray',
  },
  ACCEPTING_PROPOSALS: {
    label: 'Accepting Proposals',
    bg: 'bg-brand-green-semi-transparent',
    text: 'text-brand-green',
  },
  VOTING: {
    label: 'Voting',
    bg: 'bg-brand-purple-semi-transparent',
    text: 'text-brand-purple',
  },
  COMPLETED: {
    label: 'Completed',
    bg: 'bg-border-med',
    text: 'text-brand-black',
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'bg-brand-red-hint',
    text: 'text-brand-red',
  },
};

export default function StatusPill({ state, className = '' }: StatusPillProps) {
  const config = stateConfig[state] ?? stateConfig.COMPLETED;

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-base font-bold tracking-wide ${config.bg} ${config.text} ${className}`}
    >
      {config.label}
    </span>
  );
}
