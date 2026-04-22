import type { Difficulty, Item, MasteryState } from "./types";
import { masteryScore } from "./mastery";
import { isDue } from "./srs";

export const DIFFICULTY_TOLERANCE = 1;

export function targetDifficulty(state: MasteryState): Difficulty {
  const score = masteryScore(state);
  const raw = Math.round(score * 5);
  const clamped = Math.max(1, Math.min(5, raw || 1));
  return clamped as Difficulty;
}

function difficultyDistance(a: Difficulty, b: Difficulty): number {
  return Math.abs(a - b);
}

function staleness(state: MasteryState, itemId: string): number {
  const last = state.itemLastSeen[itemId];
  if (last === undefined) return Number.POSITIVE_INFINITY;
  return state.sessionCount - last;
}

export function selectNextItem(
  state: MasteryState,
  bank: readonly Item[],
  usedIds: ReadonlySet<string>,
  rand: () => number = Math.random,
): Item | null {
  const pool = bank.filter((i) => !usedIds.has(i.id));
  if (pool.length === 0) return null;

  const target = targetDifficulty(state);
  const due = pool.filter((i) => isDue(state, i.id));
  const candidates = due.length > 0 ? due : pool;

  let minDist = Infinity;
  for (const item of candidates) {
    const d = difficultyDistance(item.difficulty, target);
    if (d < minDist) minDist = d;
  }
  const threshold = minDist + DIFFICULTY_TOLERANCE;
  const withinTolerance = candidates.filter(
    (i) => difficultyDistance(i.difficulty, target) <= threshold,
  );

  let maxStale = -Infinity;
  for (const item of withinTolerance) {
    const s = staleness(state, item.id);
    if (s > maxStale) maxStale = s;
  }
  const stalest = withinTolerance.filter(
    (i) => staleness(state, i.id) === maxStale,
  );

  const idx = Math.floor(rand() * stalest.length);
  return stalest[idx] ?? null;
}
