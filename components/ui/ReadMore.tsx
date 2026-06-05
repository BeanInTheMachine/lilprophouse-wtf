'use client';

import { useState } from 'react';

interface ReadMoreProps {
  children: string;
  maxLength?: number;
  className?: string;
}

export default function ReadMore({ children, maxLength = 200, className = '' }: ReadMoreProps) {
  const [expanded, setExpanded] = useState(false);

  if (children.length <= maxLength) {
    return <span className={className}>{children}</span>;
  }

  const display = expanded ? children : children.slice(0, maxLength).trimEnd() + '...';

  return (
    <span className={className}>
      {display}{' '}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-brand-purple font-bold hover:underline"
      >
        {expanded ? 'Show less' : 'Read more'}
      </button>
    </span>
  );
}
