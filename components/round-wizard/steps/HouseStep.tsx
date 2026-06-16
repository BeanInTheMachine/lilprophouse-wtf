'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { useHouses } from '@/lib/hooks/useApi';
import { useHousesOnChain, useHouseOnChain, useCreateHouseOnChain } from '@/lib/hooks/useOnChain';
import Card from '@/components/ui/Card';
import InputFormGroup from '@/components/ui/InputFormGroup';
import Button from '@/components/ui/Button';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import Image from 'next/image';
import type { HouseInfo } from '@/lib/hooks/useWizardState';
import { post } from '@/lib/api-client';
import { isAddress, type Log } from 'viem';

interface HouseStepProps {
  onSelectHouse: (house: HouseInfo) => void;
}

interface MergedHouse {
  id: number;
  address: string;
  name: string;
  image: string;
  description: string;
  contractURI: string;
  existingHouse: boolean;
  roundCount: number;
  source: 'db' | 'chain' | 'both';
  loading?: boolean;
}

export default function HouseStep({ onSelectHouse }: HouseStepProps) {
  const { address, isConnected } = useAccount();
  const { data: dbHouses, loading: dbLoading, error: dbError } = useHouses();
  const { houseIds: chainHouseIds, loading: chainLoading } = useHousesOnChain();

  const [showNewHouseForm, setShowNewHouseForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImage, setNewImage] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [houseAddress, setHouseAddress] = useState<string | null>(null);

  const { createHouse, isPending: isDeploying } = useCreateHouseOnChain();
  const { isLoading: isWaiting, data: receipt } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
  });

  // When tx is confirmed, extract house address and store in DB
  useEffect(() => {
    (async () => {
      if (!receipt || !txHash || !address || houseAddress) return;

      try {
        let deployedAddress: string | null = null;

        const houseCreatedEvent = receipt.logs.find((log: Log) =>
          log.topics[0]?.toLowerCase() === '0xc3480ff86b71d5d5b239f776a04bca0fb7a8a2c9bd1e65a58f5a23f3e1162733'
        );

        if (houseCreatedEvent && houseCreatedEvent.topics[2]) {
          deployedAddress = `0x${houseCreatedEvent.topics[2].slice(26)}` as string;
        }

        if (!deployedAddress) {
          console.warn('HouseCreated event not found in receipt, using wallet address');
          deployedAddress = address;
        }

        setHouseAddress(deployedAddress);

        const house = await post<any>('/api/houses', {
          contractAddress: deployedAddress,
          name: newName.trim(),
          description: newDescription.trim() || null,
          profileImageUrl: newImage.trim() || '',
        });

        onSelectHouse({
          id: house.id,
          address: deployedAddress,
          name: house.name,
          image: house.profileImageUrl,
          description: house.description ?? '',
          contractURI: '',
          existingHouse: true,
        });
      } catch (e: any) {
        setCreateError(e.message ?? 'Failed to store house');
        setCreating(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt]);

  async function handleCreateHouse() {
    if (!newName.trim() || !address) return;
    setCreating(true);
    setCreateError('');

    if (process.env.NEXT_PUBLIC_SKIP_ONCHAIN === 'true') {
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
        setCreating(false);
      }
      return;
    }

    try {
      const hash = await createHouse(newName.trim(), newDescription.trim(), newImage.trim() || '');
      setTxHash(hash);
    } catch (e: any) {
      if (e.message?.includes('chain')) {
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
        return;
      }
      setCreateError(e.message ?? 'Transaction failed');
      setCreating(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <p className="text-brand-gray text-lg mb-2">Connect your wallet to continue</p>
        <p className="text-sm text-brand-gray">You&apos;ll see the houses you own once connected.</p>
      </div>
    );
  }

  const loading = dbLoading || chainLoading;

  // Merge DB houses + on-chain houses, deduplicating by contract address
  const mergedHouses = useMemo(() => {
    const map = new Map<string, MergedHouse>();

    // Add DB houses first
    for (const h of dbHouses ?? []) {
      if (!h.contractAddress || !isAddress(h.contractAddress)) continue;
      const key = h.contractAddress.toLowerCase();
      map.set(key, {
        id: h.id,
        address: h.contractAddress,
        name: h.name,
        image: h.profileImageUrl ?? '',
        description: h.description ?? '',
        contractURI: '',
        existingHouse: true,
        roundCount: h.rounds?.length ?? 0,
        source: 'db',
      });
    }

    // Add on-chain houses, merging with existing DB entries
    for (const houseId of chainHouseIds ?? []) {
      const key = String(houseId);
      const existing = map.get(key);

      if (existing) {
        existing.source = 'both';
      } else {
        // On-chain house without DB record — show with loading metadata
        map.set(key, {
          id: houseId,
          address: String(houseId),
          name: '(Loading...)',
          image: '',
          description: '',
          contractURI: '',
          existingHouse: true,
          roundCount: 0,
          source: 'chain',
          loading: true,
        });
      }
    }

    return Array.from(map.values());
  }, [dbHouses, chainHouseIds]);

  const hasHouse = mergedHouses.length > 0;

  if (showNewHouseForm) {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="font-bold text-xl text-brand-black mb-1">Create your house</h2>
          <p className="text-sm text-brand-gray">Think of a house as your profile page where you host rounds.</p>
        </div>

        <InputFormGroup label="House name" name="name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="My Community" required />
        <InputFormGroup label="Description" name="description" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="What is your community about?" textarea rows={3} />
        <InputFormGroup label="Profile image URL" name="image" value={newImage} onChange={(e) => setNewImage(e.target.value)} placeholder="https://example.com/logo.png" />

        {createError && <p className="text-sm text-brand-red">{createError}</p>}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowNewHouseForm(false)}>Back</Button>
          <Button
            onClick={handleCreateHouse}
            disabled={creating || isDeploying || isWaiting || !newName.trim()}
          >
            {isDeploying ? 'Confirm in wallet...' : isWaiting ? 'Deploying...' : creating ? 'Storing...' : 'Create house'}
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

      {dbError && (
        <div className="text-center py-8">
          <p className="text-brand-gray mb-4">Failed to load houses.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      )}

      {!loading && !dbError && mergedHouses.length > 0 && (
        <div className="grid gap-3">
          {mergedHouses.map((house) => (
            <MergedHouseCard
              key={house.address}
              house={house}
              onSelect={onSelectHouse}
            />
          ))}
        </div>
      )}

      {!loading && !dbError && mergedHouses.length === 0 && (
        <p className="text-sm text-brand-gray py-4">You don&apos;t own any houses yet. Create one below to get started.</p>
      )}

      <div className="border-t border-border-light pt-4">
        <Card onClick={() => setShowNewHouseForm(true)} className="p-4 flex items-center gap-4 cursor-pointer hover:border-brand-purple transition-colors">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-brand-purple-hint flex-shrink-0 flex items-center justify-center">
            <span className="text-brand-purple text-xl font-bold">+</span>
          </div>
          <p className="font-bold text-sm text-brand-black">Create a new house</p>
          <span className="text-brand-gray text-lg flex-shrink-0 ml-auto">&rarr;</span>
        </Card>
      </div>
    </div>
  );
}

function MergedHouseCard({ house, onSelect }: { house: MergedHouse; onSelect: (h: HouseInfo) => void }) {
  const { house: chainHouse } = useHouseOnChain(house.source !== 'db' ? house.id : undefined);

  const name = house.name === '(Loading...)' ? (chainHouse?.name ?? house.name) : house.name;
  const description = chainHouse?.description ?? house.description;

  return (
    <Card
      onClick={() =>
        onSelect({
          id: house.id,
          address: house.address,
          name: name,
          image: house.image,
          description: description,
          contractURI: house.contractURI,
          existingHouse: true,
        })
      }
      className="p-4 flex items-center gap-4 cursor-pointer hover:border-brand-purple transition-colors"
    >
      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-border-light flex-shrink-0">
        {house.image ? (
          <Image src={house.image} alt={name} fill className="object-cover" sizes="48px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-purple font-londrina text-lg">
            {name.charAt(0)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-sm text-brand-black truncate">
            {house.loading ? 'Loading...' : name}
          </p>
          {house.source === 'chain' && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-brand-purple-hint text-brand-purple font-medium flex-shrink-0">
              On-chain
            </span>
          )}
          {house.source === 'both' && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-brand-green-hint text-brand-green font-medium flex-shrink-0">
              On-chain
            </span>
          )}
        </div>
        <p className="font-bold text-sm text-brand-black truncate">
          {house.roundCount} round{house.roundCount !== 1 ? 's' : ''}
        </p>
        {description && (
          <p className="text-xs text-brand-gray line-clamp-2 mt-0.5">{description}</p>
        )}
      </div>
      <span className="text-brand-gray text-lg flex-shrink-0">&rarr;</span>
    </Card>
  );
}
