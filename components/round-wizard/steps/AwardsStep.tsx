'use client';

import { useState } from 'react';
import { isAddress } from 'viem';
import Button from '@/components/ui/Button';
import InputFormGroup from '@/components/ui/InputFormGroup';
import Card from '@/components/ui/Card';
import { useAssetMetadata } from '@/lib/hooks/useWeb3';
import type { EditableAsset } from '@/lib/hooks/useWizardState';

interface AwardsStepProps {
  awards: EditableAsset[];
  onUpdate: (payload: { awards: EditableAsset[]; numWinners: number }) => void;
}

const ASSET_TYPES = ['ETH', 'ERC20', 'ERC721', 'ERC1155'] as const;

function newAward(): EditableAsset {
  return { type: 'ETH', address: '', total: 0, allocated: 0, state: 'input' };
}

export default function AwardsStep({ awards, onUpdate }: AwardsStepProps) {
  const numWinners = awards.length || 1;

  function setNumWinners(count: number) {
    const clamped = Math.max(1, Math.min(10, count));
    const newAwards = [...awards];
    while (newAwards.length < clamped) newAwards.push(newAward());
    onUpdate({ awards: newAwards.slice(0, clamped), numWinners: clamped });
  }

  function updateAward(idx: number, patch: Partial<EditableAsset>) {
    const updated = awards.map((a, i) => (i === idx ? { ...a, ...patch } : a));
    onUpdate({ awards: updated, numWinners });
  }

  function removeAward(idx: number) {
    const updated = awards.filter((_, i) => i !== idx);
    onUpdate({ awards: updated.length ? updated : [newAward()], numWinners: updated.length || 1 });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-bold text-xl text-brand-black mb-1">Set the awards</h2>
        <p className="text-sm text-brand-gray">Define number of winners and what each one receives.</p>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-bold text-brand-black">Number of winners</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNumWinners(numWinners - 1)}
            disabled={numWinners <= 1}
            className="w-8 h-8 rounded-lg border border-border-med text-brand-gray disabled:opacity-30 font-bold"
          >
            -
          </button>
          <span className="font-bold text-brand-black w-8 text-center">{numWinners}</span>
          <button
            onClick={() => setNumWinners(numWinners + 1)}
            disabled={numWinners >= 10}
            className="w-8 h-8 rounded-lg border border-border-med text-brand-gray disabled:opacity-30 font-bold"
          >
            +
          </button>
        </div>
        <span className="text-xs text-brand-gray">1–10</span>
      </div>

      <div className="border-t border-border-light pt-4">
        <h3 className="font-bold text-base text-brand-black mb-4">Awards</h3>

        {awards.map((award, idx) => (
          <AwardSlot
            key={idx}
            index={idx}
            award={award}
            totalAwards={awards.length}
            onChange={(patch) => updateAward(idx, patch)}
            onRemove={() => removeAward(idx)}
          />
        ))}
      </div>
    </div>
  );
}

interface AwardSlotProps {
  index: number;
  award: EditableAsset;
  totalAwards: number;
  onChange: (patch: Partial<EditableAsset>) => void;
  onRemove: () => void;
}

function AwardSlot({ index, award, totalAwards, onChange, onRemove }: AwardSlotProps) {
  const [amountStr, setAmountStr] = useState(award.allocated ? String(award.allocated) : '');
  const [tokenAddress, setTokenAddress] = useState(award.address);

  const { name: tokenName, symbol } = useAssetMetadata(
    award.type !== 'ETH' && isAddress(tokenAddress) ? tokenAddress : undefined,
    award.type === 'ERC721' ? 'ERC721' : 'ERC20',
  );

  function handleSave() {
    if (award.type !== 'ETH' && !isAddress(tokenAddress)) {
      onChange({ state: 'error', error: 'Invalid address' });
      return;
    }
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      onChange({ state: 'error', error: 'Enter a valid amount' });
      return;
    }
    onChange({ state: 'saved', error: undefined, address: tokenAddress, allocated: amount });
  }

  return (
    <Card className={`p-4 mb-3 ${award.state === 'saved' ? 'border-brand-green bg-brand-green-hint' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold text-sm text-brand-black">
          Award #{index + 1}
          {award.state === 'saved' && <span className="ml-2 text-xs text-brand-green font-medium">Saved</span>}
          {award.state === 'error' && <span className="ml-2 text-xs text-brand-red font-medium">{award.error}</span>}
        </p>
        {award.state !== 'saved' && (
          <button onClick={onRemove} disabled={totalAwards <= 1} className="text-xs text-brand-red hover:underline disabled:opacity-30">
            Remove
          </button>
        )}
      </div>

      {award.state === 'saved' ? (
        <div className="flex items-center gap-3 text-sm">
          <span className="font-bold text-brand-black">{award.type}</span>
          {award.type !== 'ETH' && (
            <span className="text-brand-gray font-mono text-xs">{award.address.slice(0, 6)}...{award.address.slice(-4)}</span>
          )}
          <span className="text-brand-purple font-bold">{award.allocated}</span>
          {symbol && <span className="text-brand-gray">{symbol}</span>}
          {tokenName && <span className="text-brand-gray text-xs">({tokenName})</span>}
          <button
            onClick={() => { onChange({ state: 'input' }); setAmountStr(String(award.allocated || '')); setTokenAddress(award.address); }}
            className="ml-auto text-xs text-brand-purple font-bold hover:underline"
          >
            Edit
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold text-brand-gray mb-1 block">Asset type</label>
            <select
              value={award.type}
              onChange={(e) => onChange({ type: e.target.value as EditableAsset['type'] })}
              className="w-full px-3 py-2 rounded-lg border border-border-med text-sm font-medium text-brand-black bg-white"
            >
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {award.type !== 'ETH' && (
            <InputFormGroup
              label="Token address"
              name={`address-${index}`}
              value={tokenAddress}
              onChange={(e) => { setTokenAddress(e.target.value); onChange({ address: e.target.value }); }}
              placeholder="0x..."
            />
          )}

          {symbol && <p className="text-xs text-brand-gray">Token: {symbol}{tokenName ? ` (${tokenName})` : ''}</p>}

          <InputFormGroup
            label={award.type === 'ERC721' ? 'Token ID' : 'Amount'}
            name={`amount-${index}`}
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder={award.type === 'ERC721' ? '1' : '0.00'}
          />

          <Button variant="primary" className="bg-brand-purple hover:bg-brand-purple-transparent border-0 text-sm" onClick={handleSave}>
            Save award
          </Button>
        </div>
      )}
    </Card>
  );
}
