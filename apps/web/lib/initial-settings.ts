import { LiftType, UserSettings } from '@/types';

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
    accessories: [], // 초기 악세사리 자동 추가 제거 (불러오기로만 추가)
    accessoryLibrary: [],
    completedSets: {},
    prRecords: {},
    history: []
  };
};
