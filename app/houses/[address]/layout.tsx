import type { Metadata } from 'next';
import { getHouseByContractAddress } from '@/lib/services/houseService';

interface Props {
  params: { address: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const house = await getHouseByContractAddress(params.address);

  const title = house?.name ? `${house.name} — Prop House` : 'House — Prop House';
  const description = house?.description ?? 'A community funding builders through Prop House.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`/og/house/${params.address}`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/og/house/${params.address}`],
    },
  };
}

export default function HouseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
