import type { Metadata } from 'next';
import { getProposalById } from '@/lib/services/proposalService';

interface Props {
  params: { proposalId: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseInt(params.proposalId, 10);
  const proposal = !isNaN(id) ? await getProposalById(id) : null;

  const title = proposal?.title ? `${proposal.title} — Prop House` : 'Proposal — Prop House';
  const description = proposal?.tldr ?? 'A proposal on Prop House.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`/og/proposal/${params.proposalId}`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/og/proposal/${params.proposalId}`],
    },
  };
}

export default function ProposalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
