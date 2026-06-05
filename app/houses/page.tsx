'use client';

import { useHouses } from '@/lib/hooks/useApi';
import HouseCard from '@/components/HouseCard';

export default function HousesPage() {
  const { data: houses, loading, error } = useHouses();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-londrina text-3xl text-brand-black mb-2">Houses</h1>
      <p className="text-brand-gray mb-8">Communities funding builders through Prop House.</p>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 bg-border-light rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-16 text-brand-gray">
          <p>Failed to load houses.</p>
        </div>
      )}

      {houses && houses.length === 0 && (
        <div className="text-center py-16 text-brand-gray">
          <p className="text-lg font-medium">No houses found.</p>
        </div>
      )}

      {houses && houses.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {houses.map((house: any) => {
            const rounds = house.rounds ?? [];
            const activeCount = rounds.filter(
              (r: any) => r.state === 'ACCEPTING_PROPOSALS' || r.state === 'VOTING',
            ).length;

            return (
              <HouseCard
                key={house.id}
                id={house.id}
                contractAddress={house.contractAddress}
                name={house.name}
                profileImageUrl={house.profileImageUrl}
                description={house.description}
                roundCount={rounds.length}
                activeRoundCount={activeCount}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
