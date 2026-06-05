'use client';

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { useEffect, useState } from 'react';

dayjs.extend(duration);

interface CountdownProps {
  to: Date;
  onComplete?: () => void;
  className?: string;
}

export default function Countdown({ to, onComplete, className = '' }: CountdownProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const diff = dayjs(to).diff(dayjs(now));

  if (diff <= 0) {
    onComplete?.();
    return <span className={`text-sm font-medium text-brand-gray ${className}`}>Ended</span>;
  }

  const d = dayjs.duration(diff);
  const days = Math.floor(d.asDays());
  const hours = d.hours();
  const minutes = d.minutes();

  return (
    <span className={`text-sm font-bold text-brand-black font-mono ${className}`}>
      {days > 0 && `${days}d `}
      {hours.toString().padStart(2, '0')}h{' '}
      {minutes.toString().padStart(2, '0')}m
    </span>
  );
}
