import Card from '@/components/ui/Card';
import type { RoundState } from '@prisma/client';

interface RoundModuleCardProps {
  state: RoundState;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export default function RoundModuleCard({ state, title, children, className = '' }: RoundModuleCardProps) {
  const isActive = state === 'ACCEPTING_PROPOSALS' || state === 'VOTING';

  return (
    <Card className={`p-6 ${!isActive ? 'opacity-60' : ''} ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        {isActive && <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />}
        <h3 className="font-bold text-lg text-brand-black">{title}</h3>
      </div>
      {children}
    </Card>
  );
}
