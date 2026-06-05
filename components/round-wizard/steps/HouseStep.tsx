'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useHouses } from '@/lib/hooks/useApi';
import Card from '@/components/ui/Card';
import InputFormGroup from '@/components/ui/InputFormGroup';
import Button from '@/components/ui/Button';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import Image from 'next/image';
import type { HouseInfo } from '@/lib/hooks/useWizardState';
import { post } from '@/lib/api-client';

interface HouseStepProps {
  onSelectHouse: (house: HouseInfo) => void;
}

export default function HouseStep({ onSelectHouse }: HouseStepProps) {
  const { address, isConnected } = useAccount();
  const { data: houses, loading, error } = useHouses();
  const [showNewHouseForm, setShowNewHouseForm] = useState(false);

  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImage, setNewImage] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <p className="text-brand-gray text-lg mb-2">Connect your wallet to continue</p>
        <p className="text-sm text-brand-gray">You&apos;ll see the houses you own once connected.</p>
      </div>
    );
  }

  const myHouses = houses?.filter((h: any) => h.contractAddress === address?.toLowerCase()) ?? [];
  const hasHouse = myHouses.length > 0;

  if (showNewHouseForm) {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="font-bold text-xl text-brand-black mb-1">Create your house</h2>
          <p className="text-sm text-brand-gray">Think of a house as your profile page where you host rounds.</p>
        </div>

        <InputFormGroup
          label="House name"
          name="name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="My Community"
          required
        />

        <InputFormGroup
          label="Description"
          name="description"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="What is your community about?"
          textarea
          rows={3}
        />

        <InputFormGroup
          label="Profile image URL"
          name="image"
          value={newImage}
          onChange={(e) => setNewImage(e.target.value)}
          placeholder="https://example.com/logo.png"
        />

        {createError && (
          <p className="text-sm text-brand-red">{createError}</p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowNewHouseForm(false)}>Back</Button>
          <Button
            onClick={async () => {
              if (!newName.trim() || !address) return;
              setCreating(true);
              setCreateError('');
              try {
                const house = await post<any>('/api/houses', {
                  contractAddress: address,
                  name: newName.trim(),
                  description: newDescription.trim() || null,
                  profileImageUrl: newImage.trim() || '',
                });
                onSelectHouse({
                  id: house.id,
                  address: address,
                  name: house.name,
                  image: house.profileImageUrl,
                  description: house.description ?? '',
                  contractURI: '',
                  existingHouse: false,
                });
              } catch (e: any) {
                setCreateError(e.message ?? 'Failed to create house');
              } finally {
                setCreating(false);
              }
            }}
            disabled={creating || !newName.trim()}
          >
            {creating ? 'Creating...' : 'Create house'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-bold text-xl text-brand-black mb-1">Which house is the round for?</h2>
        <p className="text-sm text-brand-gray">Think of a house as your profile page where you host rounds.</p>
      </div>

      {loading && <LoadingIndicator />}

      {error && (
        <div className="text-center py-8">
          <p className="text-brand-gray mb-4">Failed to load houses.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      )}

      {!loading && !error && myHouses.length > 0 && (
        <div className="grid gap-3">
          {myHouses.map((house: any) => (
            <Card
              key={house.id}
              onClick={() =>
                onSelectHouse({
                  id: house.id,
                  address: house.contractAddress,
                  name: house.name,
                  image: house.profileImageUrl,
                  description: house.description ?? '',
                  contractURI: '',
                  existingHouse: true,
                })
              }
              className="p-4 flex items-center gap-4 cursor-pointer hover:border-brand-purple transition-colors"
            >
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-border-light flex-shrink-0">
                {house.profileImageUrl ? (
                  <Image src={house.profileImageUrl} alt={house.name} fill className="object-cover" sizes="48px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-brand-purple font-londrina text-lg">
                    {house.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-brand-black truncate">
                  {house.name} &middot; {house.rounds?.length ?? 0} round{(house.rounds?.length ?? 0) !== 1 ? 's' : ''}
                </p>
                {house.description && (
                  <p className="text-xs text-brand-gray line-clamp-2 mt-0.5">{house.description}</p>
                )}
              </div>
              <span className="text-brand-gray text-lg flex-shrink-0">&rarr;</span>
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && myHouses.length === 0 && (
        <p className="text-sm text-brand-gray py-4">You don&apos;t own any houses yet. Create one below to get started.</p>
      )}

      {!hasHouse && (
        <div className="border-t border-border-light pt-4">
        <Card
          onClick={() => setShowNewHouseForm(true)}
          className="p-4 flex items-center gap-4 cursor-pointer hover:border-brand-purple transition-colors"
        >
          <div className="w-12 h-12 rounded-full overflow-hidden bg-brand-purple-hint flex-shrink-0 flex items-center justify-center">
            <span className="text-brand-purple text-xl font-bold">+</span>
          </div>
          <p className="font-bold text-sm text-brand-black">Create a new house</p>
          <span className="text-brand-gray text-lg flex-shrink-0 ml-auto">&rarr;</span>
        </Card>
      </div>
      )}
    </div>
  );
}
