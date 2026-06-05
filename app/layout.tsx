import type { Metadata } from 'next';
import { Inter, Londrina_Solid } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const inter = Inter({
  subsets: ['latin'],
  weight: '500',
  variable: '--font-inter',
});

const londrinaSolid = Londrina_Solid({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-londrina',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://prop.house'),
  title: {
    default: 'Prop House',
    template: '%s — Prop House',
  },
  description: 'A simple and fun way to award builders. Communities deploy capital through proposal auctions where the bids are ideas. Born in and funded by Nouns DAO.',
  openGraph: {
    type: 'website',
    siteName: 'Prop House',
    title: 'Prop House',
    description: 'A simple and fun way to award builders. Born in and funded by Nouns DAO.',
    images: ['/og/default'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prop House',
    description: 'A simple and fun way to award builders. Born in and funded by Nouns DAO.',
    images: ['/og/default'],
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${londrinaSolid.variable} antialiased`}>
        <Providers>
          <div className="flex flex-col min-h-screen max-w-screen">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
