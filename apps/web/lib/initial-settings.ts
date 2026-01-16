import { LiftType, UserSettings } from '@/types';
import { INITIAL_ACCESSORIES } from '@/constants';

export const getInitialSettings = (): UserSettings => {
  return {
    currentCycle: 1,
    oneRM: {
      [LiftType.SQUAT]: 144, 
      [LiftType.OHP]: 66,   
      [LiftType.DEADLIFT]: 177, 
      [LiftType.BENCH]: 111, 
    },
    tmPercentage: 0.9,
    accessories: INITIAL_ACCESSORIES.map(a => ({ ...a, weight: 0 })),
    accessoryLibrary: [],
    completedSets: {},
    prRecords: {},
    history: []
  };
};
