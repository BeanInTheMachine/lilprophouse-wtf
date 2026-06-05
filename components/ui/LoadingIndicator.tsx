interface LoadingIndicatorProps {
  className?: string;
}

export default function LoadingIndicator({ className = '' }: LoadingIndicatorProps) {
  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <div className="w-8 h-8 border-4 border-brand-purple-semi-transparent border-t-brand-purple rounded-full animate-spin" />
    </div>
  );
}
