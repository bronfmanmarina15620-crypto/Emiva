import type { MasteryState, Skill } from "./types";
import { emptyMastery } from "./mastery";

const MASTERY_PREFIX = "emiva.mastery.v1";
const LAST_SESSION_PREFIX = "emiva.last_session.v1";

function legacyMasteryKey(profileId: string): string {
  return `${MASTERY_PREFIX}.${profileId}`;
}

function masteryKey(profileId: string, skill: Skill): string {
  return `${MASTERY_PREFIX}.${profileId}.${skill}`;
}

function lastSessionKey(profileId: string): string {
  return `${LAST_SESSION_PREFIX}.${profileId}`;
}

function migrateLegacyIfPresent(profileId: string): void {
  if (typeof window === "undefined") return;
  const legacy = window.localStorage.getItem(legacyMasteryKey(profileId));
  if (!legacy) return;
  try {
    const parsed = JSON.parse(legacy) as MasteryState;
    if (parsed && typeof parsed.skill === "string") {
      const newKey = masteryKey(profileId, parsed.skill);
      if (!window.localStorage.getItem(newKey)) {
        window.localStorage.setItem(newKey, legacy);
      }
    }
  } catch {
    // corrupt legacy value — drop it
  }
  window.localStorage.removeItem(legacyMasteryKey(profileId));
}

export function loadMastery(profileId: string, skill: Skill): MasteryState {
  if (typeof window === "undefined") return emptyMastery(skill);
  migrateLegacyIfPresent(profileId);
  try {
    const raw = window.localStorage.getItem(masteryKey(profileId, skill));
    if (!raw) return emptyMastery(skill);
    const parsed = JSON.parse(raw) as MasteryState;
    if (parsed.skill !== skill) return emptyMastery(skill);
    return parsed;
  } catch {
    return emptyMastery(skill);
  }
}

export function saveMastery(profileId: string, state: MasteryState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    masteryKey(profileId, state.skill),
    JSON.stringify(state),
  );
}

export function resetMastery(profileId: string, skill: Skill): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(masteryKey(profileId, skill));
}

export function loadLastSessionTime(profileId: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(lastSessionKey(profileId));
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function saveLastSessionTime(
  profileId: string,
  at: number = Date.now(),
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(lastSessionKey(profileId), String(at));
}
