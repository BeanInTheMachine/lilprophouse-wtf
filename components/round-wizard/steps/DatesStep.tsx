'use client';

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

  const startDate = proposalPeriodStartUnixTimestamp
    ? dayjs.unix(proposalPeriodStartUnixTimestamp).format('YYYY-MM-DDTHH:mm')
    : '';

  const proposalDays = proposalPeriodDurationSecs / 86400;
  const voteDays = votePeriodDurationSecs / 86400;

  const proposalEnd = proposalPeriodStartUnixTimestamp + proposalPeriodDurationSecs;
  const votingEnd = proposalEnd + votePeriodDurationSecs;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-bold text-xl text-brand-black mb-1">Round timing</h2>
        <p className="text-sm text-brand-gray">Set how long the round should run.</p>
      </div>

      {/* Start date */}
      <InputFormGroup
        label="Start date"
        name="startDate"
        type="datetime-local"
        value={startDate}
        onChange={(e) => {
          const ts = e.target.value ? dayjs(e.target.value).unix() : 0;
          onUpdate({ proposalPeriodStartUnixTimestamp: ts });
        }}
        required
      />

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

      {proposalPeriodStartUnixTimestamp > 0 && proposalPeriodDurationSecs > 0 && (
        <Card className="p-4 bg-surface-dark">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="text-brand-gray text-xs font-bold uppercase tracking-wider">Proposals open</p>
              <p className="font-bold text-brand-black">{dayjs.unix(proposalPeriodStartUnixTimestamp).format('MMM D, YYYY h:mm A')}</p>
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
