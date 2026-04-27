import type { Difficulty, Item, MasteryState } from "./types";
import { masteryScore } from "./mastery";
import { isDue } from "./srs";

export const DIFFICULTY_TOLERANCE = 1;

export type DesiredContext = "money" | "plain";

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

function itemContext(item: Item): "money" | "plain" {
  return "context" in item && item.context === "money" ? "money" : "plain";
}

// Per MyLevel.docx §3.1+§5.4: in each window of 5 items shown to bat-7,
// 3 should be in money context and 2 plain. Caller tracks money/plain
// counts in the current 5-window and asks for the context that keeps
// the ratio.
export function nextDesiredContext(
  moneyShownInWindow: number,
  plainShownInWindow: number,
): DesiredContext | undefined {
  if (moneyShownInWindow >= 3) return "plain";
  if (plainShownInWindow >= 2) return "money";
  return undefined;
}

export function selectNextItem(
  state: MasteryState,
  bank: readonly Item[],
  usedIds: ReadonlySet<string>,
  rand: () => number = Math.random,
  desiredContext?: DesiredContext,
): Item | null {
  const unused = bank.filter((i) => !usedIds.has(i.id));
  if (unused.length === 0) return null;

  // Apply context filter; fall back to unfiltered pool if filter empties it,
  // so the session never stalls when the bank is sparse for a context.
  const filtered =
    desiredContext === undefined
      ? unused
      : unused.filter((i) => itemContext(i) === desiredContext);
  const pool = filtered.length > 0 ? filtered : unused;

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
