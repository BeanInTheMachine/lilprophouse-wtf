interface RoundAwardsDisplayProps {
  fundingAmount: number;
  currencyType: string | null;
  numWinners: number;
  className?: string;
}

export default function RoundAwardsDisplay({
  fundingAmount,
  currencyType,
  numWinners,
  className = '',
}: RoundAwardsDisplayProps) {
  return (
    <div className={`flex items-center gap-2 text-sm text-brand-gray ${className}`}>
      <span className="font-londrina text-brand-purple text-lg">
        {fundingAmount} {currencyType ?? ''}
      </span>
      <span>&times;</span>
      <span className="font-bold text-brand-black">{numWinners}</span>
      <span>winner{numWinners !== 1 ? 's' : ''}</span>
    </div>
  );
}
