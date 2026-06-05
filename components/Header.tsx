'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const NAV_LINKS = [
  { href: '/app', label: 'Browse' },
  { href: '/houses', label: 'Houses' },
  { href: '/create/round', label: 'Create Round' },
  { href: '/dashboard', label: 'Dashboard' },
] as const;

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-border-light bg-surface-light">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link href="/" className="font-londrina text-2xl text-brand-purple no-underline">
          Prop House
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 rounded-xl text-sm font-bold transition-colors ${
                pathname.startsWith(link.href)
                  ? 'bg-brand-purple-hint text-brand-purple'
                  : 'text-brand-gray hover:text-brand-black hover:bg-border-light'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ConnectButton
            chainStatus="none"
            showBalance={false}
            accountStatus="address"
          />
          <button
            className="md:hidden p-2 rounded-xl text-brand-gray hover:bg-border-light"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M6 6l12 12M18 6l-12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t border-border-light px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                pathname.startsWith(link.href)
                  ? 'bg-brand-purple-hint text-brand-purple'
                  : 'text-brand-gray hover:text-brand-black hover:bg-border-light'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
