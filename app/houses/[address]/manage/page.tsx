'use client';

import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useHouse } from '@/lib/hooks/useApi';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import Link from 'next/link';

export default function HouseManagerPage() {
  const params = useParams<{ address: string }>();
  const { data: house, loading, error } = useHouse(params.address);

  if (loading) return <LoadingIndicator />;
  if (error || !house) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-brand-black mb-2">House not found</h2>
        <Link href="/houses" className="text-brand-purple font-bold hover:underline">&larr; All houses</Link>
      </div>
    );
  }

  const isOnChain = house.contractAddress && house.contractAddress !== '0x0000000000000000000000000000000000000000';

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link href={`/houses/${params.address}`} className="inline-flex items-center text-sm font-medium text-brand-gray hover:text-brand-black mb-6">
        &larr; Back to house
      </Link>

      <h1 className="font-londrina text-3xl text-brand-black mb-2">Manage House</h1>
      <p className="text-brand-gray mb-8">{house.name}</p>

      <div className="grid gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-lg text-brand-black mb-4">House Information</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Name', house.name],
              ['Address', house.contractAddress?.slice(0, 10) + '...' + house.contractAddress?.slice(-6) || 'N/A'],
              ['Rounds', String(house.rounds?.length ?? 0)],
              ['On-Chain', isOnChain ? 'Yes' : 'No (DB only)'],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="text-brand-gray">{label}</span>
                <p className="font-bold text-brand-black">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 border-brand-red-semi-transparent">
          <h3 className="font-bold text-lg text-brand-red mb-4">Danger Zone</h3>
          <p className="text-sm text-brand-gray mb-4">
            Transferring house ownership is permanent and cannot be undone. This feature is coming soon.
          </p>
          <Button variant="outline" disabled className="border-brand-red text-brand-red">
            Transfer Ownership
          </Button>
        </Card>
      </div>
    </div>
  );
}
