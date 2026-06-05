import type { Metadata } from 'next';
import { getHouseByContractAddress } from '@/lib/services/houseService';

interface Props {
  params: Promise<{ address: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  const house = await getHouseByContractAddress(address);

  const title = house?.name ? `${house.name} — Prop House` : 'House — Prop House';
  const description = house?.description ?? 'A community funding builders through Prop House.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`/og/house/${address}`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/og/house/${address}`],
    },
  };
}

export default function HouseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
