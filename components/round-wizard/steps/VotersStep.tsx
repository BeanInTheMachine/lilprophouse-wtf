'use client';

import { useState, useRef } from 'react';
import { isAddress } from 'viem';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import InputFormGroup from '@/components/ui/InputFormGroup';
import Card from '@/components/ui/Card';
import type { GovPowerStrategy } from '@/lib/hooks/useWizardState';

interface VotersStepProps {
  voters: GovPowerStrategy[];
  onUpdate: (payload: { voters: GovPowerStrategy[] }) => void;
}

const STRATEGY_LABELS: Record<string, string> = {
  BALANCE_OF: 'Token Holders (ERC-721)',
  BALANCE_OF_ERC20: 'Token Holders (ERC-20)',
  BALANCE_OF_ERC1155: 'Token Holders (ERC-1155)',
  ALLOWLIST: 'Allowlist',
};

export default function VotersStep({ voters, onUpdate }: VotersStepProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);
  const fileRef = useRef<HTMLInputElement>(null);

  const [newType, setNewType] = useState('BALANCE_OF');
  const [newAddress, setNewAddress] = useState('');
  const [newMultiplier, setNewMultiplier] = useState('1');
  const [newTokenId, setNewTokenId] = useState('');
  const [addError, setAddError] = useState('');

  const [csvMessage, setCsvMessage] = useState('');
  const [csvVoters, setCsvVoters] = useState<{ address: string; votes: string }[]>([]);

  function getTotalVoterCount() {
    return voters.reduce((count, v) => {
      if (v.strategyType === 'ALLOWLIST' && v.members) return count + v.members.length;
      return count + 1;
    }, 0);
  }

  function handleAddVoter() {
    setAddError('');
    if (!isAddress(newAddress)) {
      setAddError('Invalid Ethereum address');
      return;
    }
    const multiplier = Number(newMultiplier) || 1;

    if (newType === 'ALLOWLIST') {
      const existingIdx = voters.findIndex((v) => v.strategyType === 'ALLOWLIST');
      if (existingIdx >= 0) {
        const updated = [...voters];
        const existing = { ...updated[existingIdx] } as GovPowerStrategy & { members: { address: string; govPower: string }[] };
        if (existing.members?.find((m) => m.address === newAddress.toLowerCase())) {
          setAddError('Address already in allowlist');
          return;
        }
        existing.members = [...(existing.members ?? []), { address: newAddress.toLowerCase(), govPower: multiplier.toString() }];
        updated[existingIdx] = existing;
        onUpdate({ voters: updated });
      } else {
        onUpdate({
          voters: [
            ...voters,
            {
              strategyType: 'ALLOWLIST',
              address: '',
              multiplier: 1,
              members: [{ address: newAddress.toLowerCase(), govPower: multiplier.toString() }],
            },
          ],
        });
      }
    } else {
      onUpdate({
        voters: [
          ...voters,
          {
            strategyType: newType as GovPowerStrategy['strategyType'],
            address: newAddress.toLowerCase(),
            multiplier,
            tokenId: newTokenId || undefined,
          },
        ],
      });
    }

    setNewAddress('');
    setNewMultiplier('1');
    setNewTokenId('');
    setShowAddModal(false);
  }

  function handleRemoveVoter(address: string, type: string) {
    if (type === 'ALLOWLIST') {
      const existingIdx = voters.findIndex((v) => v.strategyType === 'ALLOWLIST');
      if (existingIdx < 0) return;
      const updated = [...voters];
      const existing = { ...updated[existingIdx] } as GovPowerStrategy & { members: { address: string; govPower: string }[] };
      if (existing.members && existing.members.length <= 1) {
        updated.splice(existingIdx, 1);
      } else if (existing.members) {
        existing.members = existing.members.filter((m) => m.address !== address.toLowerCase());
        updated[existingIdx] = existing;
      }
      onUpdate({ voters: updated });
    } else {
      onUpdate({ voters: voters.filter((v) => 'address' in v && v.address !== address.toLowerCase()) });
    }

    const totalAfter = getTotalVoterCount();
    if (totalAfter < displayCount) setDisplayCount(totalAfter);
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const Papa = (await import('papaparse')).default;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const invalid: string[] = [];
        const duplicates: string[] = [];
        const newMembers: { address: string; govPower: string }[] = [];

        const existingAllowlist = voters.find((v) => v.strategyType === 'ALLOWLIST');
        const existingMembers = (existingAllowlist as any)?.members ?? [];

        for (const row of results.data as any[]) {
          const addr = (row.address ?? row.Address ?? '').trim();
          const votes = (row.votes ?? row.Votes ?? '1').trim();
          if (!addr || !isAddress(addr)) {
            invalid.push(addr || '(empty)');
            continue;
          }
          if (existingMembers.find((m: any) => m.address === addr.toLowerCase())) {
            duplicates.push(addr);
            continue;
          }
          if (newMembers.find((m) => m.address === addr.toLowerCase())) {
            duplicates.push(addr);
            continue;
          }
          newMembers.push({ address: addr.toLowerCase(), govPower: votes });
        }

        const added = newMembers.length;

        if (added > 0) {
          if (existingAllowlist) {
            const updated = [...voters];
            const idx = voters.indexOf(existingAllowlist);
            const allowlist = { ...updated[idx] } as GovPowerStrategy & { members: { address: string; govPower: string }[] };
            allowlist.members = [...(allowlist.members ?? []), ...newMembers];
            updated[idx] = allowlist;
            onUpdate({ voters: updated });
          } else {
            onUpdate({ voters: [...voters, { strategyType: 'ALLOWLIST', address: '', multiplier: 1, members: newMembers }] });
          }
        }

        setCsvMessage(`Added ${added} voter${added !== 1 ? 's' : ''}. ${duplicates.length} duplicate${duplicates.length !== 1 ? 's' : ''}. ${invalid.length} invalid address${invalid.length !== 1 ? 'es' : ''}.`);
      },
    });

    setShowCsvModal(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  const totalVoters = getTotalVoterCount();
  const visibleCount = Math.min(displayCount, totalVoters);
  let shown = 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-bold text-xl text-brand-black mb-1">Set who can participate</h2>
        <p className="text-sm text-brand-gray">Define who can vote in your round and how many votes they get.</p>
      </div>

      <div className="border-t border-border-light pt-4">
        <h3 className="font-bold text-base text-brand-black mb-1">Voters</h3>
        <p className="text-sm text-brand-gray mb-4">Determine who can vote in your round and how many votes they get.</p>

        {csvMessage && (
          <p className="text-sm text-brand-gray mb-4 p-3 bg-brand-purple-hint rounded-xl">{csvMessage}</p>
        )}

        {totalVoters === 0 && (
          <p className="text-sm text-brand-gray py-4 text-center">No voters added yet. Add voters or upload a CSV.</p>
        )}

        <div className="flex flex-col gap-3 mb-4 max-h-64 overflow-y-auto">
          {voters.map((v, vi) => {
            if (v.strategyType === 'ALLOWLIST' && v.members) {
              return v.members.map((m, mi) => {
                shown++;
                if (shown > visibleCount) return null;
                return (
                  <Card key={`${vi}-${mi}`} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-brand-black font-mono">{m.address.slice(0, 6)}...{m.address.slice(-4)}</p>
                      <p className="text-xs text-brand-gray">Allowlist &middot; {m.govPower} vote{m.govPower !== '1' ? 's' : ''}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveVoter(m.address, 'ALLOWLIST')}
                      className="text-sm text-brand-red hover:underline font-medium"
                    >
                      Remove
                    </button>
                  </Card>
                );
              });
            }
            shown++;
            if (shown > visibleCount) return null;
            return (
              <Card key={vi} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-brand-black font-mono">{v.address.slice(0, 6)}...{v.address.slice(-4)}</p>
                  <p className="text-xs text-brand-gray">
                    {v.strategyType === 'ALLOWLIST' ? 'Allowlist' : STRATEGY_LABELS[v.strategyType] ?? v.strategyType} &middot; {v.multiplier}&times;
                    {v.tokenId ? ` (ID: ${v.tokenId})` : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveVoter(v.address, v.strategyType)}
                  className="text-sm text-brand-red hover:underline font-medium"
                >
                  Remove
                </button>
              </Card>
            );
          })}
        </div>

        {totalVoters > 10 && displayCount < totalVoters && (
          <button
            onClick={() => setDisplayCount(totalVoters)}
            className="text-sm text-brand-purple font-bold hover:underline mb-4 block"
          >
            Show {totalVoters - displayCount} more voter{totalVoters - displayCount !== 1 ? 's' : ''}
          </button>
        )}

        <div className="flex gap-3">
          <Button variant="primary" className="bg-brand-pink hover:bg-brand-pink-semi-transparent border-0" onClick={() => setShowAddModal(true)}>
            Add a voter
          </Button>
          <Button variant="outline" onClick={() => setShowCsvModal(true)}>
            Upload CSV
          </Button>
        </div>
      </div>

      {/* Add Voter Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
        <div className="p-6">
          <h3 className="font-bold text-lg text-brand-black mb-4">Add a voter</h3>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-bold text-brand-black mb-1 block">Strategy type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border-med text-sm font-medium text-brand-black bg-white"
              >
                {Object.entries(STRATEGY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <InputFormGroup
              label="Address"
              name="address"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="0x..."
            />

            {newType !== 'ALLOWLIST' && (
              <InputFormGroup
                label="Multiplier"
                name="multiplier"
                type="number"
                value={newMultiplier}
                onChange={(e) => setNewMultiplier(e.target.value)}
                placeholder="1"
              />
            )}

            {(newType === 'BALANCE_OF_ERC1155') && (
              <InputFormGroup
                label="Token ID"
                name="tokenId"
                value={newTokenId}
                onChange={(e) => setNewTokenId(e.target.value)}
                placeholder="1"
              />
            )}

            {addError && <p className="text-sm text-brand-red">{addError}</p>}

            <Button onClick={handleAddVoter}>Add</Button>
          </div>
        </div>
      </Modal>

      {/* CSV Upload Modal */}
      <Modal isOpen={showCsvModal} onClose={() => setShowCsvModal(false)}>
        <div className="p-6">
          <h3 className="font-bold text-lg text-brand-black mb-2">Upload CSV</h3>
          <p className="text-sm text-brand-gray mb-4">
            Upload a CSV file with <code className="bg-border-light px-1 rounded">address</code> and <code className="bg-border-light px-1 rounded">votes</code> columns.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            className="w-full text-sm text-brand-gray file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-brand-pink file:text-white hover:file:bg-brand-pink-semi-transparent"
          />
        </div>
      </Modal>
    </div>
  );
}
