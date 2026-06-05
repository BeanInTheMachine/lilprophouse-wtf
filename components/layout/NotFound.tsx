import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-24 text-center">
      <h1 className="font-londrina text-6xl text-brand-purple mb-4">404</h1>
      <p className="text-brand-gray text-lg mb-8">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link
        href="/"
        className="inline-flex items-center px-5 py-2.5 rounded-full text-sm font-bold bg-brand-purple text-white hover:opacity-90 transition-all"
      >
        Go home
      </Link>
    </div>
  );
}
