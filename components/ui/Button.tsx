interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'outline' | 'ghost';
  disabled?: boolean;
  className?: string;
}

const variants = {
  primary: 'bg-brand-purple text-white hover:opacity-90',
  outline: 'bg-transparent text-brand-purple border-2 border-brand-purple hover:bg-brand-purple-hint',
  ghost: 'bg-transparent text-brand-gray hover:text-brand-black hover:bg-border-light',
};

export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  className = '',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-150 ${variants[variant]} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}
