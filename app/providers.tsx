'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, type Theme } from '@rainbow-me/rainbowkit';
import { AnalyticsProvider } from '@/lib/analytics';
import { config } from '@/lib/wagmi';
import '@rainbow-me/rainbowkit/styles.css';
import { useState } from 'react';

const theme: Theme = {
  blurs: {
    modalOverlay: 'blur(5px)',
  },
  colors: {
    accentColor: '#8a2be2',
    accentColorForeground: '#ffffff',
    actionButtonBorder: 'rgba(0,0,0,0.04)',
    actionButtonBorderMobile: 'rgba(0,0,0,0.06)',
    actionButtonSecondaryBackground: 'rgba(0,0,0,0.06)',
    closeButton: '#666666',
    closeButtonBackground: 'rgba(0,0,0,0.04)',
    connectButtonBackground: '#ffffff',
    connectButtonBackgroundError: '#ff494a',
    connectButtonInnerBackground: 'linear-gradient(0deg, rgba(0,0,0,0.06), rgba(0,0,0,0.12))',
    connectButtonText: '#14161b',
    connectButtonTextError: '#ffffff',
    connectionIndicator: '#30e000',
    downloadBottomCardBackground: 'linear-gradient(126deg, rgba(0,0,0,0.02) 9.49%, rgba(0,0,0,0.04) 71.04%), rgba(0,0,0,0.02)',
    downloadTopCardBackground: 'linear-gradient(126deg, rgba(0,0,0,0.02) 9.49%, rgba(0,0,0,0.04) 71.04%), rgba(0,0,0,0.02)',
    error: '#ff494a',
    generalBorder: 'rgba(0,0,0,0.06)',
    generalBorderDim: 'rgba(0,0,0,0.03)',
    menuItemBackground: 'rgba(0,0,0,0.06)',
    modalBackdrop: 'rgba(0,0,0,0.3)',
    modalBackground: '#ffffff',
    modalBorder: 'transparent',
    modalText: '#14161b',
    modalTextDim: 'rgba(0,0,0,0.3)',
    modalTextSecondary: 'rgba(0,0,0,0.6)',
    profileAction: '#ffffff',
    profileActionHover: 'rgba(0,0,0,0.06)',
    profileForeground: 'rgba(0,0,0,0.06)',
    selectedOptionBorder: 'rgba(0,0,0,0.1)',
    standby: '#666666',
  },
  fonts: {
    body: 'PT Root UI, system-ui, sans-serif',
  },
  radii: {
    actionButton: '10px',
    connectButton: '10px',
    menuButton: '10px',
    modal: '16px',
    modalMobile: '16px',
  },
  shadows: {
    connectButton: '0px 4px 12px rgba(0,0,0,0.03)',
    dialog: '0px 8px 24px rgba(0,0,0,0.12)',
    profileDetailsAction: '0px 2px 6px rgba(0,0,0,0.05)',
    selectedOption: '0px 2px 6px rgba(0,0,0,0.05)',
    selectedWallet: '0px 2px 6px rgba(0,0,0,0.08)',
    walletLogo: '0px 2px 6px rgba(0,0,0,0.06)',
  },
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={theme}>
          <AnalyticsProvider>{children}</AnalyticsProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
