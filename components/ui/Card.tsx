import Link from 'next/link';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
}

export default function Card({ children, className = '', href, onClick }: CardProps) {
  const classes = `bg-surface-light border border-border-light rounded-2xl shadow-low transition-all duration-150 ease-out hover:shadow-high ${href ? 'cursor-pointer' : ''} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={`${classes} w-full text-left`}>
        {children}
      </button>
    );
  }

  return <div className={classes}>{children}</div>;
}
