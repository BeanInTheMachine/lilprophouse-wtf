'use client';

import Link from 'next/link';
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { IoSettingsSharp } from 'react-icons/io5';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="border-b border-border-light bg-surface-light">
      <div className="container mx-auto flex items-center justify-between px-4" style={{ paddingTop: '0.5rem', paddingBottom: '0.75rem' }}>
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <Image src="/bulb.png" alt="Prop House" width={45} height={45} className="h-[45px] w-auto" unoptimized />
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/create/round"
            className="inline-flex items-center justify-center rounded-[10px] px-3 py-1.5 text-sm font-bold text-white bg-brand-purple hover:bg-brand-purple-transparent transition-colors h-10 no-underline"
          >
            Create a round
          </Link>

          <RainbowConnectButton
            showBalance={false}
            label="Connect"
            accountStatus="avatar"
            chainStatus="icon"
          />

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-[10px] px-3 py-1.5 text-sm font-bold text-brand-black bg-white border border-border-med hover:text-brand-gray transition-colors h-10 no-underline"
          >
            <IoSettingsSharp />
          </Link>
        </div>
      </div>
    </header>
  );
}
