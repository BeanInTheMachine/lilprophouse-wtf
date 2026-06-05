'use client';

import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';

export default function ConnectButton() {
  return (
    <RainbowConnectButton
      chainStatus="none"
      showBalance={false}
      accountStatus="address"
    />
  );
}
