const FOOTER_LINKS = [
  { href: 'https://prop-house.gitbook.io/prop-house/', label: 'FAQs' },
  { href: 'https://twitter.com/nounsprophouse', label: '@nounsprophouse' },
  { href: 'https://github.com/prop-house/prop-house-monorepo', label: 'github' },
  { href: '#', label: 'terms of service' },
] as const;

export default function Footer() {
  return (
    <footer className="pt-24 pb-12 flex justify-center items-end border-0">
      <nav className="flex gap-2.5 text-sm font-bold text-brand-pink">
        {FOOTER_LINKS.map((link, i) => (
          <span key={link.label} className="flex items-center gap-2.5">
            {i > 0 && <span className="text-brand-pink">·</span>}
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-pink hover:underline"
            >
              {link.label}
            </a>
          </span>
        ))}
      </nav>
    </footer>
  );
}
