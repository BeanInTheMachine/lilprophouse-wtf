'use client';

import { useReducer, useCallback } from 'react';

export interface HouseInfo {
  id: number;
  address: string;
  name: string;
  image: string;
  description: string;
  contractURI: string;
  existingHouse: boolean;
}

export interface GovPowerStrategy {
  strategyType: 'BALANCE_OF' | 'BALANCE_OF_ERC20' | 'BALANCE_OF_ERC721' | 'BALANCE_OF_ERC1155' | 'ALLOWLIST';
  address: string;
  multiplier: number;
  tokenId?: string;
  assetType?: string;
  members?: { address: string; govPower: string }[];
}

export interface EditableAsset {
  type: 'ETH' | 'ERC20' | 'ERC721' | 'ERC1155';
  address: string;
  total: number;
  allocated: number;
  tokenId?: string;
  symbol?: string;
  name?: string;
  state: 'input' | 'saved' | 'error';
  error?: string;
}

export interface RoundWizardState {
  activeStep: number;
  stepDisabled: boolean[];
  round: {
    house: HouseInfo;
    title: string;
    description: string;
    voters: GovPowerStrategy[];
    awards: EditableAsset[];
    numWinners: number;
    roundType: 'TIMED' | 'INFINITE';
    proposalPeriodStartUnixTimestamp: number;
    proposalPeriodDurationSecs: number;
    votePeriodDurationSecs: number;
    quorumFor: number | null;
    quorumAgainst: number | null;
    votingPeriod: number | null;
  };
}

type WizardAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'UPDATE_ROUND'; payload: Partial<RoundWizardState['round']> }
  | { type: 'VALIDATE_STEP' };

const EMPTY_HOUSE: HouseInfo = {
  id: 0,
  address: '',
  name: '',
  image: '',
  description: '',
  contractURI: '',
  existingHouse: true,
};

export const INITIAL_STATE: RoundWizardState = {
  activeStep: 1,
  stepDisabled: [true, true, true, true, true, true],
  round: {
    house: EMPTY_HOUSE,
    title: '',
    description: '',
    voters: [],
    awards: [],
    numWinners: 1,
    roundType: 'TIMED',
    proposalPeriodStartUnixTimestamp: 0,
    proposalPeriodDurationSecs: 0,
    votePeriodDurationSecs: 0,
    quorumFor: null,
    quorumAgainst: null,
    votingPeriod: null,
  },
};

function isStepValid(state: RoundWizardState, step: number): boolean {
  const { round } = state;
  switch (step) {
    case 1:
      return round.house.address !== '';
    case 2:
      return round.title.trim().length > 0 && round.title.length <= 128;
    case 3:
      return round.voters.length > 0;
    case 4:
      return (
        round.awards.length > 0 &&
        round.awards.every((a) => a.state === 'saved') &&
        round.numWinners > 0
      );
    case 5:
      if (round.roundType === 'TIMED') {
        return (
          round.proposalPeriodStartUnixTimestamp > 0 &&
          round.proposalPeriodDurationSecs > 0 &&
          round.votePeriodDurationSecs > 0
        );
      }
      return round.proposalPeriodStartUnixTimestamp > 0;
    case 6:
      return true;
    default:
      return false;
  }
}

function removeIncompleteAwards(round: RoundWizardState['round']): RoundWizardState['round'] {
  return {
    ...round,
    awards: round.awards.filter((a) => a.state === 'saved'),
    numWinners: round.awards.filter((a) => a.state === 'saved').length || 1,
  };
}

function recalculateStepDisabled(state: RoundWizardState): boolean[] {
  return state.stepDisabled.map((_, idx) => !isStepValid(state, idx + 1)) as boolean[];
}

function wizardReducer(state: RoundWizardState, action: WizardAction): RoundWizardState {
  switch (action.type) {
    case 'SET_STEP': {
      const newStep = Math.max(1, Math.min(6, action.payload));
      return { ...state, activeStep: newStep };
    }

    case 'NEXT_STEP': {
      const cleaned = removeIncompleteAwards(state.round);
      const nextStep = Math.min(state.activeStep + 1, 6);
      const newState = {
        ...state,
        activeStep: nextStep,
        round: cleaned,
      };
      return { ...newState, stepDisabled: recalculateStepDisabled(newState) };
    }

    case 'PREV_STEP': {
      const cleaned = removeIncompleteAwards(state.round);
      const prevStep = Math.max(state.activeStep - 1, 1);
      return {
        ...state,
        activeStep: prevStep,
        round: cleaned,
      };
    }

    case 'UPDATE_ROUND': {
      const newRound = { ...state.round, ...action.payload };
      const newState = { ...state, round: newRound };
      const stepDisabled = recalculateStepDisabled(newState);

      const houseJustSelected =
        action.payload.house &&
        action.payload.house.address !== '' &&
        state.activeStep === 1 &&
        !stepDisabled[0];

      return {
        ...newState,
        stepDisabled,
        activeStep: houseJustSelected ? 2 : state.activeStep,
      };
    }

    case 'VALIDATE_STEP': {
      return { ...state, stepDisabled: recalculateStepDisabled(state) };
    }

    default:
      return state;
  }
}

export function useWizardState() {
  const [state, dispatch] = useReducer(wizardReducer, INITIAL_STATE);

  const setStep = useCallback((step: number) => dispatch({ type: 'SET_STEP', payload: step }), []);
  const nextStep = useCallback(() => dispatch({ type: 'NEXT_STEP' }), []);
  const prevStep = useCallback(() => dispatch({ type: 'PREV_STEP' }), []);
  const updateRound = useCallback(
    (payload: Partial<RoundWizardState['round']>) => dispatch({ type: 'UPDATE_ROUND', payload }),
    [],
  );
  const validateStep = useCallback(() => dispatch({ type: 'VALIDATE_STEP' }), []);

  return {
    state,
    activeStep: state.activeStep,
    stepDisabled: state.stepDisabled,
    round: state.round,
    setStep,
    nextStep,
    prevStep,
    updateRound,
    validateStep,
  };
}
