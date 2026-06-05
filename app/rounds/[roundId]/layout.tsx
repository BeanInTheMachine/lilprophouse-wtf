import type { Metadata } from 'next';
import { getRoundById } from '@/lib/services/roundService';

interface Props {
  params: { roundId: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseInt(params.roundId, 10);
  const round = !isNaN(id) ? await getRoundById(id) : null;

  const title = round?.title ? `${round.title} — Prop House` : 'Round — Prop House';
  const description = round?.description ?? 'A funding round on Prop House.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`/og/round/${params.roundId}`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/og/round/${params.roundId}`],
    },
  };
}

export default function RoundLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
