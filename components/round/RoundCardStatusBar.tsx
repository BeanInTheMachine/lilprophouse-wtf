import type { RoundState } from '@prisma/client';

interface RoundCardStatusBarProps {
  state: RoundState;
  className?: string;
}

const stateColors: Record<RoundState, string> = {
  NOT_STARTED: 'bg-border-light',
  ACCEPTING_PROPOSALS: 'bg-brand-green',
  VOTING: 'bg-brand-purple',
  COMPLETED: 'bg-brand-gray',
  CANCELLED: 'bg-brand-red',
};

export default function RoundCardStatusBar({ state, className = '' }: RoundCardStatusBarProps) {
  return <div className={`h-1 rounded-full ${stateColors[state] ?? stateColors.NOT_STARTED} ${className}`} />;
}
