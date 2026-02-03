import { LiftType, WorkoutHistory } from '@/types';
import { calculateE1RM } from './calculators';

/** Parse reps from history (e.g. "5+", "3", 5) to number for e1RM */
export function parseReps(reps: number | string): number {
  if (typeof reps === 'number') return reps;
  const s = String(reps).trim().replace(/\+$/, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** Main sets for completion/volume: 본세트, PR 세트, 디로딩 */
export function isMainSetLabel(label: string): boolean {
  return /본세트|PR\s*세트|디로딩/.test(label);
}

export function isPRSetLabel(label: string): boolean {
  return /PR\s*세트/.test(label);
}

/**
 * e1RM from a single workout entry (main lift only).
 * Prefer PR set if available and completed; else heaviest completed main set.
 */
export function getE1RMFromEntry(entry: WorkoutHistory): number | null {
  if (entry.lift === LiftType.WEAKNESS || !entry.mainSets?.length) return null;

  const mainSets = entry.mainSets.filter(s => isMainSetLabel(s.label) && s.completed);
  if (mainSets.length === 0) return null;

  const prSet = mainSets.find(s => isPRSetLabel(s.label));
  const setToUse = prSet ?? mainSets.reduce((best, s) => (s.weight > best.weight ? s : best), mainSets[0]);
  const reps = parseReps(setToUse.reps);
  if (reps <= 0) return null;

  return Math.round(calculateE1RM(setToUse.weight, reps) * 10) / 10;
}

/** Tooltip string for a single entry's e1RM (e.g. "C1 W3 · 110kg × 3 → e1RM 121kg") */
export function getE1RMTooltipFromEntry(entry: WorkoutHistory): string | null {
  if (entry.lift === LiftType.WEAKNESS || !entry.mainSets?.length) return null;

  const mainSets = entry.mainSets.filter(s => isMainSetLabel(s.label) && s.completed);
  if (mainSets.length === 0) return null;

  const prSet = mainSets.find(s => isPRSetLabel(s.label));
  const setToUse = prSet ?? mainSets.reduce((best, s) => (s.weight > best.weight ? s : best), mainSets[0]);
  const reps = parseReps(setToUse.reps);
  if (reps <= 0) return null;

  const e1RM = calculateE1RM(setToUse.weight, reps);
  return `C${entry.cycle} W${entry.week} · ${setToUse.weight}kg × ${reps} → e1RM ${Math.round(e1RM * 10) / 10}kg`;
}

export interface WeekSummary {
  completionPct: number;
  totalVolumeKg: number;
  prCount: number;
}

/** Aggregate completion %, total main-set volume (kg), and PR count for a list of entries (e.g. one week). */
export function getWeekSummary(entries: WorkoutHistory[]): WeekSummary {
  let mainTotal = 0;
  let mainCompleted = 0;
  let prCount = 0;

  for (const entry of entries) {
    for (const set of entry.mainSets || []) {
      if (!isMainSetLabel(set.label)) continue;
      mainTotal += 1;
      if (set.completed) mainCompleted += 1;
      if (isPRSetLabel(set.label) && set.completed) prCount += 1;
    }
  }

  return {
    completionPct: mainTotal > 0 ? Math.round((mainCompleted / mainTotal) * 100) : 0,
    totalVolumeKg: entries.reduce((sum, e) => {
      for (const set of e.mainSets || []) {
        if (isMainSetLabel(set.label) && set.completed) {
          const r = parseReps(set.reps);
          sum += set.weight * (r > 0 ? r : 0);
        }
      }
      return sum;
    }, 0),
    prCount,
  };
}

export interface WeeklyE1RMPoint {
  weekLabel: string;
  cycle: number;
  week: number;
  e1RM: number;
  tooltip: string;
}

/** Per-lift weekly e1RM (max per week). Sorted by cycle then week. */
export function getWeeklyE1RMPerLift(
  history: WorkoutHistory[]
): Record<Exclude<LiftType, LiftType.WEAKNESS>, WeeklyE1RMPoint[]> {
  const lifts: Exclude<LiftType, LiftType.WEAKNESS>[] = [
    LiftType.SQUAT,
    LiftType.BENCH,
    LiftType.DEADLIFT,
    LiftType.OHP,
  ];
  const result = {} as Record<Exclude<LiftType, LiftType.WEAKNESS>, WeeklyE1RMPoint[]>;

  for (const lift of lifts) {
    const byWeek = new Map<string, { e1RM: number; tooltip: string; cycle: number; week: number }>();

    const entries = history.filter(e => e.lift === lift);
    for (const entry of entries) {
      const e1RM = getE1RMFromEntry(entry);
      const tooltip = getE1RMTooltipFromEntry(entry);
      if (e1RM == null || !tooltip) continue;

      const key = `${entry.cycle}-${entry.week}`;
      const existing = byWeek.get(key);
      if (!existing || e1RM > existing.e1RM) {
        byWeek.set(key, { e1RM, tooltip, cycle: entry.cycle, week: entry.week });
      }
    }

    const points: WeeklyE1RMPoint[] = Array.from(byWeek.entries())
      .map(([, v]) => ({
        weekLabel: `C${v.cycle} W${v.week}`,
        cycle: v.cycle,
        week: v.week,
        e1RM: v.e1RM,
        tooltip: v.tooltip,
      }))
      .sort((a, b) => a.cycle !== b.cycle ? a.cycle - b.cycle : a.week - b.week);

    result[lift] = points;
  }

  return result;
}

/** Latest e1RM, change over last 4 weeks, and max e1RM for a lift. */
export function getLiftE1RMSummary(
  points: WeeklyE1RMPoint[]
): { latest: number; change4w: number | null; max: number } {
  if (points.length === 0) return { latest: 0, change4w: null, max: 0 };
  const latest = points[points.length - 1].e1RM;
  const max = Math.max(...points.map(p => p.e1RM));
  const fourWeeksAgo = points.length > 4 ? points[points.length - 5] : points[0];
  const change4w = points.length >= 2 ? Math.round((latest - fourWeeksAgo.e1RM) * 10) / 10 : null;
  return { latest, change4w, max };
}

/** Sort key for history entries: use timestamp if set, else cycle/week. */
export function getEntrySortKey(entry: WorkoutHistory): number {
  if (entry.timestamp != null) return entry.timestamp;
  return entry.cycle * 10 + entry.week;
}
