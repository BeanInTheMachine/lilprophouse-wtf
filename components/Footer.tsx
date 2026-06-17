const FOOTER_LINKS = [
  { href: 'https://prop-house.gitbook.io/prop-house/', label: 'FAQs' },
  { href: 'https://twitter.com/nounsprophouse', label: '@nounsprophouse' },
  { href: 'https://github.com/prop-house/prop-house-monorepo', label: 'github' },
  { href: '/prophouse-tos.d4f29d36.pdf', label: 'terms of service' },
] as const;

export default function Footer() {
  return (
    <footer className="pt-8 pb-12 flex justify-center items-end border-0 bg-brand-purple">
      <nav className="flex gap-2.5 text-sm font-bold text-white/80">
        {FOOTER_LINKS.map((link, i) => (
          <span key={link.label} className="flex items-center gap-2.5">
            {i > 0 && <span className="text-white/60">·</span>}
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          </span>
        ))}
      </nav>
    </footer>
  );
}
