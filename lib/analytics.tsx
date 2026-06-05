'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const ANALYTICS_ID = process.env.NEXT_PUBLIC_ANALYTICS_ID;

export function usePageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (!ANALYTICS_ID) return;

    if (typeof window !== 'undefined') {
      fetch('https://www.google-analytics.com/collect', {
        method: 'POST',
        body: new URLSearchParams({
          v: '1',
          tid: ANALYTICS_ID,
          cid: '555',
          t: 'pageview',
          dp: pathname,
          dl: window.location.href,
          dt: document.title,
        }),
        mode: 'no-cors',
      });
    }
  }, [pathname]);
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  usePageView();
  return <>{children}</>;
}
