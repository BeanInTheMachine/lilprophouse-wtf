'use client';

import { useEffect } from 'react';

export function SuppressBorderError() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('border')) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    window.addEventListener('error', handleError, true);
    return () => window.removeEventListener('error', handleError, true);
  }, []);

  return null;
}
