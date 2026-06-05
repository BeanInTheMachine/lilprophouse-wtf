'use client';

import { useAccount } from 'wagmi';
import ConnectButton from './ConnectButton';

interface ConnectToContinueProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function ConnectToContinue({ children, fallback }: ConnectToContinueProps) {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      fallback ?? (
        <div className="text-center py-16">
          <p className="text-brand-gray text-lg mb-4">Connect your wallet to continue</p>
          <ConnectButton />
        </div>
      )
    );
  }

  return <>{children}</>;
}
