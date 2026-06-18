'use client';

import { useState, useEffect } from 'react';
import InputFormGroup from '@/components/ui/InputFormGroup';
import Card from '@/components/ui/Card';
import dayjs from 'dayjs';

interface DatesStepProps {
  proposalPeriodStartUnixTimestamp: number;
  proposalPeriodDurationSecs: number;
  votePeriodDurationSecs: number;
  onUpdate: (payload: {
    proposalPeriodStartUnixTimestamp?: number;
    proposalPeriodDurationSecs?: number;
    votePeriodDurationSecs?: number;
  }) => void;
}

export default function DatesStep(props: DatesStepProps) {
  const { proposalPeriodStartUnixTimestamp, proposalPeriodDurationSecs, votePeriodDurationSecs, onUpdate } = props;

  const valueFromTs = (ts: number) =>
    ts ? dayjs.unix(ts).format('YYYY-MM-DDTHH:mm') : '';

  const [draft, setDraft] = useState(valueFromTs(proposalPeriodStartUnixTimestamp));
  const [committed, setCommitted] = useState(proposalPeriodStartUnixTimestamp);

  useEffect(() => {
    setDraft(valueFromTs(proposalPeriodStartUnixTimestamp));
    setCommitted(proposalPeriodStartUnixTimestamp);
  }, [proposalPeriodStartUnixTimestamp]);

  const startDate = valueFromTs(committed);
  const proposalDays = proposalPeriodDurationSecs / 86400;
  const voteDays = votePeriodDurationSecs / 86400;

  const proposalEnd = committed + proposalPeriodDurationSecs;
  const votingEnd = proposalEnd + votePeriodDurationSecs;

  function confirmDate() {
    const ts = draft ? dayjs(draft).unix() : 0;
    setCommitted(ts);
    onUpdate({ proposalPeriodStartUnixTimestamp: ts });
  }

  function cancelDraft() {
    setDraft(valueFromTs(committed));
  }

  const dirty = draft !== valueFromTs(committed);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-bold text-xl text-brand-black mb-1">Round timing</h2>
        <p className="text-sm text-brand-gray">Set how long the round should run.</p>
      </div>

      {/* Start date */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <InputFormGroup
            label="Start date"
            name="startDate"
            type="datetime-local"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            required
          />
        </div>
        {dirty && (
          <div className="flex gap-2 pb-0.5">
            <button
              onClick={confirmDate}
              className="px-3 py-2 rounded-[10px] text-sm font-bold text-white bg-brand-purple hover:bg-brand-purple-transparent transition-colors"
            >
              OK
            </button>
            <button
              onClick={cancelDraft}
              className="px-3 py-2 rounded-[10px] text-sm font-bold text-brand-gray bg-surface-dark hover:bg-border-light transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InputFormGroup
          label="Proposal period (days)"
          name="proposalDays"
          type="number"
          value={proposalDays ? String(proposalDays) : ''}
          onChange={(e) => onUpdate({ proposalPeriodDurationSecs: (Number(e.target.value) || 0) * 86400 })}
          placeholder="7"
        />
        <InputFormGroup
          label="Vote period (days)"
          name="voteDays"
          type="number"
          value={voteDays ? String(voteDays) : ''}
          onChange={(e) => onUpdate({ votePeriodDurationSecs: (Number(e.target.value) || 0) * 86400 })}
          placeholder="3"
        />
      </div>

      {committed > 0 && proposalPeriodDurationSecs > 0 && (
        <Card className="p-4 bg-surface-dark">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="text-brand-gray text-xs font-bold uppercase tracking-wider">Proposals open</p>
              <p className="font-bold text-brand-black">{dayjs.unix(committed).format('MMM D, YYYY h:mm A')}</p>
            </div>
            <div>
              <p className="text-brand-gray text-xs font-bold uppercase tracking-wider">Proposals close</p>
              <p className="font-bold text-brand-black">{dayjs.unix(proposalEnd).format('MMM D, YYYY h:mm A')}</p>
            </div>
            {votePeriodDurationSecs > 0 && (
              <div>
                <p className="text-brand-gray text-xs font-bold uppercase tracking-wider">Voting ends</p>
                <p className="font-bold text-brand-black">{dayjs.unix(votingEnd).format('MMM D, YYYY h:mm A')}</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
