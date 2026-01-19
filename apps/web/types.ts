export enum LiftType {
  SQUAT = 'SQUAT',
  OHP = 'OHP',
  DEADLIFT = 'DEADLIFT',
  BENCH = 'BENCH',
  WEAKNESS = 'WEAKNESS'
}

export type OneRMData = Record<Exclude<LiftType, LiftType.WEAKNESS>, number>;

export interface SetInfo {
  id: string;
  label: string;
  reps: string;
  percentage: number;
  isPR?: boolean;
  isJoker?: boolean;
  isWarmup?: boolean;
}

export interface AccessoryExercise {
  id: string;
  name: string;
  weight: number;
  reps: string;
  sets: number;
  targetLifts: LiftType[];
}

export interface WorkoutHistory {
  id: string;
  date: string;
  cycle: number;
  week: number;
  lift: LiftType;
  mainSets: { weight: number; reps: number | string; label: string; completed: boolean }[];
  accessories: { name: string; weight: number; sets: number; reps: string }[];
}

export interface UserSettings {
  currentCycle: number;
  oneRM: OneRMData;
  tmPercentage: number;
  accessories: AccessoryExercise[];
  accessoryLibrary: Omit<AccessoryExercise, 'id' | 'targetLifts'>[]; // New: Library for saved accessories
  completedSets: Record<string, boolean>; // key: 'cycle-week-lift-setId'
  prRecords: Record<string, number>; // key: 'cycle-week-lift-setId'
  history: WorkoutHistory[];
}

export type WeekType = 1 | 2 | 3 | 4 | 5 | 6 | 7;
