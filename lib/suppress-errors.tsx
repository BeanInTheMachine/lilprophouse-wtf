'use client';

import { useEffect } from 'react';

export function SuppressStyleErrors() {
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const msg = typeof args[0] === 'string' ? args[0] : '';
      if (msg.includes('border') || msg.includes('invalid style')) {
        return;
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return null;
}
