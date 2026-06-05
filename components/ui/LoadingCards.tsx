interface LoadingCardsProps {
  count?: number;
  className?: string;
}

export default function LoadingCards({ count = 4, className = '' }: LoadingCardsProps) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-36 bg-border-light rounded-2xl animate-pulse" />
      ))}
    </div>
  );
}
