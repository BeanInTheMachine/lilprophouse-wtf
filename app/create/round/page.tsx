'use client';

import { useState, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import InputFormGroup from '@/components/ui/InputFormGroup';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Divider from '@/components/ui/Divider';
import { post } from '@/lib/api-client';
import Link from 'next/link';

interface WizardState {
  type: 'TIMED' | 'INFINITE';
  title: string;
  description: string;
  fundingAmount: string;
  currencyType: string;
  numWinners: string;
  startTime: string;
  proposalEndTime: string;
  votingEndTime: string;
  quorumFor: string;
  quorumAgainst: string;
  votingPeriod: string;
}

type Action = { type: 'SET'; field: keyof WizardState; value: string };

const initialState: WizardState = {
  type: 'TIMED',
  title: '',
  description: '',
  fundingAmount: '',
  currencyType: 'ETH',
  numWinners: '1',
  startTime: '',
  proposalEndTime: '',
  votingEndTime: '',
  quorumFor: '',
  quorumAgainst: '',
  votingPeriod: '7',
};

function reducer(state: WizardState, action: Action): WizardState {
  return { ...state, [action.field]: action.value };
}

const STEPS = ['Type', 'Details', 'Schedule', 'Review'];

export default function CreateRoundPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(field: keyof WizardState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      dispatch({ type: 'SET', field, value: e.target.value });
  }

  function validateStep(): boolean {
    const errs: Record<string, string> = {};
    if (step === 1) {
      if (!state.title.trim()) errs.title = 'Required';
      if (!state.fundingAmount || Number(state.fundingAmount) <= 0) errs.fundingAmount = 'Required';
      if (!state.numWinners || Number(state.numWinners) < 1) errs.numWinners = 'Required';
    }
    if (step === 2 && state.type === 'TIMED') {
      if (!state.startTime) errs.startTime = 'Required';
      if (!state.proposalEndTime) errs.proposalEndTime = 'Required';
      if (!state.votingEndTime) errs.votingEndTime = 'Required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const body: any = {
        type: state.type,
        title: state.title,
        description: state.description || null,
        fundingAmount: Number(state.fundingAmount),
        currencyType: state.currencyType || null,
        numWinners: Number(state.numWinners),
        startTime: new Date(state.startTime).toISOString(),
        houseId: 1,
        propStrategy: { type: 'all' },
        voteStrategy: { type: 'all' },
      };

      if (state.type === 'TIMED') {
        body.proposalEndTime = new Date(state.proposalEndTime).toISOString();
        body.votingEndTime = new Date(state.votingEndTime).toISOString();
      } else {
        body.quorumFor = Number(state.quorumFor) || null;
        body.quorumAgainst = Number(state.quorumAgainst) || null;
        body.votingPeriod = Number(state.votingPeriod) || 7;
      }

      await post('/api/rounds', body);
      router.push('/app');
    } catch (e: any) {
      setError(e.message ?? 'Failed to create round');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link
        href="/app"
        className="inline-flex items-center text-sm font-medium text-brand-gray hover:text-brand-black mb-6"
      >
        &larr; Browse rounds
      </Link>

      <h1 className="font-londrina text-3xl text-brand-black mb-2">Create Round</h1>
      <p className="text-brand-gray mb-8">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>

      {/* Step indicators */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full transition-colors ${i <= step ? 'bg-brand-purple' : 'bg-border-light'}`}
          />
        ))}
      </div>

      {error && (
        <div className="bg-brand-red-hint border border-brand-red-semi-transparent rounded-xl px-4 py-3 text-sm font-medium text-brand-red mb-6">
          {error}
        </div>
      )}

      {/* Step 0: Type */}
      {step === 0 && (
        <div className="grid gap-4">
          <Card
            onClick={() => dispatch({ type: 'SET', field: 'type', value: 'TIMED' })}
            className={`p-5 border-2 ${state.type === 'TIMED' ? 'border-brand-purple bg-brand-purple-hint' : 'border-transparent'}`}
          >
            <h3 className="font-bold text-lg text-brand-black mb-1">Timed Round</h3>
            <p className="text-sm text-brand-gray">
              Fixed proposal and voting windows. Winners chosen at the end.
            </p>
          </Card>
          <Card
            onClick={() => dispatch({ type: 'SET', field: 'type', value: 'INFINITE' })}
            className={`p-5 border-2 ${state.type === 'INFINITE' ? 'border-brand-purple bg-brand-purple-hint' : 'border-transparent'}`}
          >
            <h3 className="font-bold text-lg text-brand-black mb-1">Continuous Round</h3>
            <p className="text-sm text-brand-gray">
              Proposals accepted continuously. Each proposal gets its own voting period.
            </p>
          </Card>
        </div>
      )}

      {/* Step 1: Details */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <InputFormGroup label="Title" name="title" value={state.title} onChange={set('title')} placeholder="Round title" error={errors.title} required />
          <InputFormGroup label="Description" name="description" value={state.description} onChange={set('description')} placeholder="Describe the round" textarea rows={3} />
          <div className="grid grid-cols-2 gap-4">
            <InputFormGroup label="Funding per Winner" name="fundingAmount" type="number" value={state.fundingAmount} onChange={set('fundingAmount')} placeholder="5" error={errors.fundingAmount} required />
            <InputFormGroup label="Currency" name="currencyType" value={state.currencyType} onChange={set('currencyType')} placeholder="ETH" />
          </div>
          <InputFormGroup label="Number of Winners" name="numWinners" type="number" value={state.numWinners} onChange={set('numWinners')} placeholder="1" error={errors.numWinners} required />
        </div>
      )}

      {/* Step 2: Schedule */}
      {step === 2 && state.type === 'TIMED' && (
        <div className="flex flex-col gap-4">
          <InputFormGroup label="Start Time" name="startTime" type="datetime-local" value={state.startTime} onChange={set('startTime')} error={errors.startTime} required />
          <InputFormGroup label="Proposal Deadline" name="proposalEndTime" type="datetime-local" value={state.proposalEndTime} onChange={set('proposalEndTime')} error={errors.proposalEndTime} required />
          <InputFormGroup label="Voting End Time" name="votingEndTime" type="datetime-local" value={state.votingEndTime} onChange={set('votingEndTime')} error={errors.votingEndTime} required />
        </div>
      )}
      {step === 2 && state.type === 'INFINITE' && (
        <div className="flex flex-col gap-4">
          <InputFormGroup label="Start Time" name="startTime" type="datetime-local" value={state.startTime} onChange={set('startTime')} required />
          <div className="grid grid-cols-2 gap-4">
            <InputFormGroup label="Quorum For" name="quorumFor" type="number" value={state.quorumFor} onChange={set('quorumFor')} placeholder="10" />
            <InputFormGroup label="Quorum Against" name="quorumAgainst" type="number" value={state.quorumAgainst} onChange={set('quorumAgainst')} placeholder="5" />
          </div>
          <InputFormGroup label="Voting Period (days)" name="votingPeriod" type="number" value={state.votingPeriod} onChange={set('votingPeriod')} placeholder="7" />
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <Card className="p-5 flex flex-col gap-3">
          <div><span className="text-sm text-brand-gray">Type:</span> <span className="font-bold">{state.type === 'TIMED' ? 'Timed Round' : 'Continuous Round'}</span></div>
          <Divider />
          <div><span className="text-sm text-brand-gray">Title:</span> <span className="font-bold">{state.title}</span></div>
          {state.description && <div><span className="text-sm text-brand-gray">Description:</span> {state.description}</div>}
          <Divider />
          <div><span className="text-sm text-brand-gray">Funding:</span> <span className="font-bold">{state.fundingAmount} {state.currencyType}</span></div>
          <div><span className="text-sm text-brand-gray">Winners:</span> <span className="font-bold">{state.numWinners}</span></div>
          <Divider />
          {state.type === 'TIMED' ? (
            <>
              <div><span className="text-sm text-brand-gray">Start:</span> {state.startTime}</div>
              <div><span className="text-sm text-brand-gray">Proposals close:</span> {state.proposalEndTime}</div>
              <div><span className="text-sm text-brand-gray">Voting ends:</span> {state.votingEndTime}</div>
            </>
          ) : (
            <>
              <div><span className="text-sm text-brand-gray">Start:</span> {state.startTime}</div>
              <div><span className="text-sm text-brand-gray">Quorum:</span> {state.quorumFor || '—'} for / {state.quorumAgainst || '—'} against</div>
              <div><span className="text-sm text-brand-gray">Voting period:</span> {state.votingPeriod} days</div>
            </>
          )}
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0}>
          Back
        </Button>
        {step < 3 ? (
          <Button onClick={() => { if (validateStep()) setStep(step + 1); }}>
            Next
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Round'}
          </Button>
        )}
      </div>
    </div>
  );
}
