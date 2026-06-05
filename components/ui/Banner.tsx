interface BannerProps {
  children: React.ReactNode;
  variant?: 'info' | 'warning' | 'success';
  className?: string;
}

const variantStyles = {
  info: 'bg-brand-purple-hint text-brand-purple border-brand-purple-semi-transparent',
  warning: 'bg-brand-yellow-hint text-brand-yellow border-brand-yellow-semi-transparent',
  success: 'bg-brand-green-hint text-brand-green border-brand-green-semi-transparent',
};

export default function Banner({ children, variant = 'info', className = '' }: BannerProps) {
  return (
    <div className={`px-4 py-3 rounded-xl border text-sm font-medium ${variantStyles[variant]} ${className}`}>
      {children}
    </div>
  );
}
