import type { MasteryState, Skill } from "./types";
import {
  GRADUATION_MIN_CORRECT,
  GRADUATION_MIN_GAP_MS,
  GRADUATION_MIN_SESSIONS,
  WINDOW_SIZE,
} from "./types";

export function emptyMastery(skill: Skill): MasteryState {
  return {
    skill,
    attempts: [],
    srs: {},
    sessionCount: 0,
    sessionTimestamps: [],
    itemLastSeen: {},
  };
}

export function recordItemShown(
  state: MasteryState,
  itemId: string,
): MasteryState {
  return {
    ...state,
    itemLastSeen: { ...state.itemLastSeen, [itemId]: state.sessionCount },
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

export function incrementSession(
  state: MasteryState,
  now: number = Date.now(),
): MasteryState {
  return {
    ...state,
    sessionCount: state.sessionCount + 1,
    sessionTimestamps: [...state.sessionTimestamps, now],
  };
}

export type GraduationResult =
  | { graduated: true; firstAttemptCorrect: number; sessionCount: number; gapMs: number }
  | { graduated: false; reason: "need_more_correct" | "need_more_sessions" | "need_more_time";
      firstAttemptCorrect: number; sessionCount: number; gapMs: number };

export function skillGraduated(
  state: MasteryState,
  now: number = Date.now(),
): GraduationResult {
  const firstAttemptCorrect = state.attempts.filter((a) => a.correct).length;
  const sessionCount = state.sessionTimestamps.length;
  const firstSession = state.sessionTimestamps[0];
  const gapMs = firstSession !== undefined ? now - firstSession : 0;

  if (firstAttemptCorrect < GRADUATION_MIN_CORRECT) {
    return { graduated: false, reason: "need_more_correct", firstAttemptCorrect, sessionCount, gapMs };
  }
  if (sessionCount < GRADUATION_MIN_SESSIONS) {
    return { graduated: false, reason: "need_more_sessions", firstAttemptCorrect, sessionCount, gapMs };
  }
  if (gapMs < GRADUATION_MIN_GAP_MS) {
    return { graduated: false, reason: "need_more_time", firstAttemptCorrect, sessionCount, gapMs };
  }
  return { graduated: true, firstAttemptCorrect, sessionCount, gapMs };
}
