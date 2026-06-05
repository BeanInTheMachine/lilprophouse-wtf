interface ErrorMessageCardProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorMessageCard({ message, onRetry, className = '' }: ErrorMessageCardProps) {
  return (
    <div className={`bg-brand-red-hint border border-brand-red-semi-transparent rounded-xl p-5 text-center ${className}`}>
      <p className="text-brand-red text-sm font-medium mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-bold text-brand-red hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
