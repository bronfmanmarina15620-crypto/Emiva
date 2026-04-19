import type { Attempt, MasteryState, Skill } from "./types";
import { WINDOW_SIZE } from "./types";

export function emptyMastery(skill: Skill): MasteryState {
  return {
    skill,
    attempts: [],
    srs: {},
    sessionCount: 0,
  };
}

export function recordAttempt(
  state: MasteryState,
  itemId: string,
  correct: boolean,
  now: number = Date.now(),
): MasteryState {
  const attempts = [...state.attempts, { itemId, correct, at: now }];
  return { ...state, attempts };
}

export function masteryScore(state: MasteryState): number {
  const recent = state.attempts.slice(-WINDOW_SIZE);
  if (recent.length === 0) return 0;
  const correct = recent.filter((a) => a.correct).length;
  return correct / recent.length;
}

export function incrementSession(state: MasteryState): MasteryState {
  return { ...state, sessionCount: state.sessionCount + 1 };
}
