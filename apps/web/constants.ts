import { LiftType, SetInfo, WeekType } from './types';

export const LIFT_LABELS: Record<LiftType, string> = {
  [LiftType.SQUAT]: '스쿼트',
  [LiftType.OHP]: '오버헤드 프레스',
  [LiftType.DEADLIFT]: '데드리프트',
  [LiftType.BENCH]: '벤치프레스'
};

// Simplified logic for week templates based on the CSV
export const getSetsForWeek = (week: WeekType): SetInfo[] => {
  const baseWarmups: SetInfo[] = [
    { id: 'w1', label: '워밍업 1', reps: '5', percentage: 0.4, isWarmup: true },
    { id: 'w2', label: '워밍업 2', reps: '5', percentage: 0.5, isWarmup: true },
    { id: 'w3', label: '워밍업 3', reps: '3', percentage: 0.6, isWarmup: true },
  ];

  const jokerSets: SetInfo[] = [
    { id: 'j1', label: '조커 1', reps: '1', percentage: 0.95, isJoker: true },
    { id: 'j2', label: '조커 2', reps: '1', percentage: 1.0, isJoker: true },
    { id: 'j3', label: '조커 3', reps: '1', percentage: 1.05, isJoker: true },
  ];

  if (week === 7) {
    return [
      { id: 'd1', label: '디로딩 1', reps: '5', percentage: 0.4, isWarmup: true },
      { id: 'd2', label: '디로딩 2', reps: '5', percentage: 0.5, isWarmup: true },
      { id: 'd3', label: '디로딩 3', reps: '5', percentage: 0.6, isWarmup: true },
    ];
  }

  // Week 1, 4 (Hypertrophy / 5 reps)
  if (week === 1 || week === 4) {
    return [
      ...baseWarmups,
      { id: 'b1', label: '본세트 1', reps: '5', percentage: 0.65 },
      { id: 'b2', label: '본세트 2', reps: '5', percentage: 0.75 },
      { id: 'pr', label: 'PR 세트', reps: '5+', percentage: 0.85, isPR: true },
      ...jokerSets
    ];
  }

  // Week 2, 5 (Transition / 3 reps)
  if (week === 2 || week === 5) {
    return [
      ...baseWarmups,
      { id: 'b1', label: '본세트 1', reps: '3', percentage: 0.70 },
      { id: 'b2', label: '본세트 2', reps: '3', percentage: 0.80 },
      { id: 'pr', label: 'PR 세트', reps: '3+', percentage: 0.90, isPR: true },
      ...jokerSets
    ];
  }

  // Week 3, 6 (Strength / 1 rep)
  if (week === 3 || week === 6) {
    return [
      ...baseWarmups,
      { id: 'b1', label: '본세트 1', reps: '5', percentage: 0.75 },
      { id: 'b2', label: '본세트 2', reps: '3', percentage: 0.85 },
      { id: 'pr', label: 'PR 세트', reps: '1+', percentage: 0.95, isPR: true },
      ...jokerSets
    ];
  }

  return [];
};

export const INITIAL_ACCESSORIES = [
  { id: 'acc-1', name: '복근 (행잉 레그레이즈)', reps: '10-15', sets: 3, targetLifts: [LiftType.SQUAT, LiftType.DEADLIFT] },
  { id: 'acc-2', name: '턱걸이/랫풀다운', reps: '8-12', sets: 3, targetLifts: [LiftType.BENCH, LiftType.OHP] },
  { id: 'acc-3', name: '덤벨 로우', reps: '10-12', sets: 3, targetLifts: [LiftType.BENCH, LiftType.OHP] },
  { id: 'acc-4', name: '악력 훈련', reps: 'Hold', sets: 3, targetLifts: [LiftType.DEADLIFT] },
];
