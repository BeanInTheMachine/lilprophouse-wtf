'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import { useHouse } from '@/lib/hooks/useApi';
import { useIssueCreatorPass, useHasCreatorPass } from '@/lib/hooks/useOnChain';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import InputFormGroup from '@/components/ui/InputFormGroup';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import Link from 'next/link';

export default function HouseManagerPage() {
  const params = useParams<{ address: string }>();
  const { address: wallet } = useAccount();
  const { data: house, loading, error } = useHouse(params.address);
  const { hasPass, loading: passLoading } = useHasCreatorPass(house?.id);
  const { issuePass, isPending } = useIssueCreatorPass();

  const [inviteAddress, setInviteAddress] = useState('');
  const [actionStatus, setActionStatus] = useState('');
  const [actionError, setActionError] = useState('');

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

  async function handleIssuePass() {
    if (!inviteAddress.trim() || !isAddress(inviteAddress.trim())) {
      setActionError('Enter a valid Ethereum address');
      return;
    }
    if (!isOnChain) {
      setActionError('This house is not deployed on-chain. Creator passes only work for on-chain houses.');
      return;
    }
    setActionError('');
    setActionStatus('issuing');
    try {
      await issuePass(house.id, inviteAddress.trim());
      setActionStatus('sent');
      setInviteAddress('');
    } catch (e: any) {
      setActionError(e.message ?? 'Failed to issue pass');
      setActionStatus('');
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link href={`/houses/${params.address}`} className="inline-flex items-center text-sm font-medium text-brand-gray hover:text-brand-black mb-6">
        &larr; Back to house
      </Link>

      <h1 className="font-londrina text-3xl text-brand-black mb-2">Manage House</h1>
      <p className="text-brand-gray mb-8">{house.name}</p>

      {actionError && (
        <div className="bg-brand-red-hint border border-brand-red-semi-transparent rounded-xl px-4 py-3 text-sm font-medium text-brand-red mb-6">
          {actionError}
        </div>
      )}

      {actionStatus === 'sent' && (
        <div className="bg-brand-green-hint border border-brand-green-semi-transparent rounded-xl px-4 py-3 text-sm font-medium text-brand-green mb-6">
          Creator pass issued successfully.
        </div>
      )}

      <div className="grid gap-6">
        {/* House Info */}
        <Card className="p-6">
          <h3 className="font-bold text-lg text-brand-black mb-4">House Information</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Name', house.name],
              ['Address', house.contractAddress.slice(0, 10) + '...' + house.contractAddress.slice(-6)],
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

        {/* Creator Passes */}
        <Card className="p-6">
          <h3 className="font-bold text-lg text-brand-black mb-4">Creator Passes</h3>
          <p className="text-sm text-brand-gray mb-4">
            Creator passes allow other wallets to create rounds on this house.
            {!isOnChain && ' Passes require the house to be deployed on-chain.'}
          </p>

          <div className="flex gap-3">
            <InputFormGroup
              label="Wallet address"
              name="invite"
              value={inviteAddress}
              onChange={(e) => setInviteAddress(e.target.value)}
              placeholder="0x..."
              className="flex-1"
            />
          </div>

          <div className="mt-3">
            <Button
              onClick={handleIssuePass}
              disabled={isPending || !inviteAddress.trim() || !isOnChain}
            >
              {isPending ? 'Sending...' : 'Issue Pass'}
            </Button>
          </div>
        </Card>

        {/* Danger Zone */}
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
