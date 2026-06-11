'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Divider from '@/components/ui/Divider';
import ReadMore from '@/components/ui/ReadMore';
import RoundInfoStep from './RoundInfoStep';
import DatesStep from './DatesStep';
import VotersStep from './VotersStep';
import AwardsStep from './AwardsStep';
import type { RoundWizardState, GovPowerStrategy, EditableAsset } from '@/lib/hooks/useWizardState';

interface ReviewStepProps {
  round: RoundWizardState['round'];
  onUpdate: (payload: Partial<RoundWizardState['round']>) => void;
  onCreate: () => void;
  isCreating: boolean;
}

const STRATEGY_LABELS: Record<string, string> = {
  BALANCE_OF: 'Token Holders (ERC-721)',
  BALANCE_OF_ERC20: 'Token Holders (ERC-20)',
  BALANCE_OF_ERC1155: 'Token Holders (ERC-1155)',
  ALLOWLIST: 'Allowlist',
};

export default function ReviewStep({ round, onUpdate, onCreate, isCreating }: ReviewStepProps) {
  const [editSection, setEditSection] = useState<string | null>(null);

  const startDate = round.proposalPeriodStartUnixTimestamp
    ? dayjs.unix(round.proposalPeriodStartUnixTimestamp)
    : null;
  const proposalEnd = startDate?.add(round.proposalPeriodDurationSecs, 'second') ?? null;
  const votingEnd = proposalEnd?.add(round.votePeriodDurationSecs, 'second') ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-bold text-xl text-brand-black mb-1">Create the round</h2>
        <p className="text-sm text-brand-gray">Review the round settings and create it.</p>
      </div>

      {/* Dates */}
      <SectionBlock
        label="Dates"
        onEdit={() => setEditSection('dates')}
      >
        {startDate && proposalEnd && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-brand-black font-bold">{startDate.format('MMM D, YYYY')}</span>
            <span className="text-brand-gray">&rarr;</span>
            <span className="text-brand-black font-bold">{proposalEnd.format('MMM D, YYYY')}</span>
            {votingEnd && round.votePeriodDurationSecs > 0 && (
              <>
                <span className="text-brand-gray">&rarr;</span>
                <span className="text-brand-black font-bold">{votingEnd.format('MMM D, YYYY')}</span>
              </>
            )}
          </div>
        )}
      </SectionBlock>

      <Divider />

      {/* Title & Description */}
      <SectionBlock
        label="Round info"
        onEdit={() => setEditSection('info')}
      >
        <h3 className="font-bold text-brand-black">{round.title || 'Untitled'}</h3>
        {round.description && (
          <ReadMore className="text-sm text-brand-gray leading-relaxed mt-1">{round.description}</ReadMore>
        )}
      </SectionBlock>

      <Divider />

      {/* Voters */}
      <SectionBlock
        label="Voters"
        onEdit={() => setEditSection('voters')}
      >
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
          {round.voters.length === 0 && (
            <p className="text-sm text-brand-gray">No voters configured.</p>
          )}
          {round.voters.map((v, vi) => {
            if (v.strategyType === 'ALLOWLIST' && v.members) {
              return v.members.map((m, mi) => (
                <VoterCardMini key={`${vi}-${mi}`} address={m.address} multiplier={Number(m.govPower)} type="ALLOWLIST" />
              ));
            }
            return <VoterCardMini key={vi} address={v.address} multiplier={v.multiplier} type={v.strategyType as string} />;
          })}
        </div>
      </SectionBlock>

      <Divider />

      {/* Awards */}
      <SectionBlock
        label="Awards"
        onEdit={() => setEditSection('awards')}
      >
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
          {[...Array(round.numWinners)].map((_, idx) => {
            const award = round.awards[round.awards.length === 1 ? 0 : idx];
            if (!award) return null;
            return (
              <div key={idx} className="flex items-center gap-3 p-3 bg-surface-dark rounded-xl text-sm">
                <span className="font-bold text-brand-purple">#{idx + 1}</span>
                <span className="text-brand-black">{award.type}</span>
                {award.type !== 'ETH' && (
                  <span className="text-brand-gray font-mono text-xs">{award.address.slice(0, 6)}...{award.address.slice(-4)}</span>
                )}
                <span className="text-brand-black font-bold">{award.allocated}</span>
                {award.symbol && <span className="text-brand-gray">{award.symbol}</span>}
              </div>
            );
          })}
        </div>
      </SectionBlock>

      <Divider />

      <div className="flex justify-end">
        <Button onClick={onCreate} disabled={isCreating} variant="primary" className="bg-brand-pink hover:bg-brand-pink-semi-transparent border-0">
          {isCreating ? 'Pending...' : 'Create Round'}
        </Button>
      </div>

      {/* Edit modals */}
      <Modal isOpen={editSection === 'info'} onClose={() => setEditSection(null)}>
        <div className="p-6">
          <RoundInfoStep
            title={round.title}
            description={round.description}
            onUpdate={(p) => { onUpdate(p); setEditSection(null); }}
          />
        </div>
      </Modal>

      <Modal isOpen={editSection === 'dates'} onClose={() => setEditSection(null)}>
        <div className="p-6">
          <DatesStep
            proposalPeriodStartUnixTimestamp={round.proposalPeriodStartUnixTimestamp}
            proposalPeriodDurationSecs={round.proposalPeriodDurationSecs}
            votePeriodDurationSecs={round.votePeriodDurationSecs}
            onUpdate={(p) => { onUpdate(p); setEditSection(null); }}
          />
        </div>
      </Modal>

      <Modal isOpen={editSection === 'voters'} onClose={() => setEditSection(null)}>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <VotersStep
            voters={round.voters}
            onUpdate={(p) => { onUpdate(p); setEditSection(null); }}
          />
        </div>
      </Modal>

      <Modal isOpen={editSection === 'awards'} onClose={() => setEditSection(null)}>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <AwardsStep
            awards={round.awards}
            onUpdate={(p) => { onUpdate(p); }}
          />
        </div>
      </Modal>
    </div>
  );
}

function SectionBlock({ label, onEdit, children }: { label: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-brand-gray uppercase tracking-wider">{label}</p>
        <button onClick={onEdit} className="text-xs text-brand-purple font-bold hover:underline">Edit</button>
      </div>
      {children}
    </div>
  );
}

function VoterCardMini({ address, multiplier, type }: { address: string; multiplier: number; type: string }) {
  return (
    <div className="flex items-center justify-between p-2.5 bg-surface-dark rounded-xl">
      <div>
        <p className="text-sm font-bold text-brand-black font-mono">{address.slice(0, 6)}...{address.slice(-4)}</p>
        <p className="text-xs text-brand-gray">{type === 'ALLOWLIST' ? 'Allowlist' : (STRATEGY_LABELS[type] ?? type)} · {multiplier}&times;</p>
      </div>
    </div>
  );
}
