import Link from 'next/link';

const FOOTER_LINKS = [
  { href: '/faq', label: 'FAQ' },
  { href: 'https://discord.gg/SKPzM8GHts', label: 'Discord' },
  { href: 'https://github.com/prop-house/prop-house-monorepo', label: 'GitHub' },
  { href: 'https://twitter.com/prop_house', label: 'Twitter' },
] as const;

export default function Footer() {
  return (
    <footer className="border-t border-border-light bg-surface-dark mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-londrina text-lg text-brand-purple">Prop House</span>
            <span className="text-sm text-brand-gray">
              &mdash; A Nouns DAO project
            </span>
          </div>

          <nav className="flex items-center gap-6">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="text-sm font-medium text-brand-gray hover:text-brand-black transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-6 pt-6 border-t border-border-light text-center text-xs text-brand-gray">
          A simple and fun way to award builders. Born in and funded by Nouns DAO.
        </div>
      </div>
    </footer>
  );
}
