import type { MasteryState, Skill } from "./types";
import { emptyMastery } from "./mastery";

const MASTERY_PREFIX = "emiva.mastery.v1";
const LAST_SESSION_PREFIX = "emiva.last_session.v1";
const GRADUATED_PREFIX = "emiva.graduated.v1";

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

function normalizeMastery(raw: unknown, skill: Skill): MasteryState {
  if (!raw || typeof raw !== "object") return emptyMastery(skill);
  const r = raw as Partial<MasteryState>;
  if (r.skill !== skill) return emptyMastery(skill);
  return {
    skill,
    attempts: Array.isArray(r.attempts) ? r.attempts : [],
    srs: r.srs && typeof r.srs === "object" ? r.srs : {},
    sessionCount: typeof r.sessionCount === "number" ? r.sessionCount : 0,
    sessionTimestamps: Array.isArray(r.sessionTimestamps)
      ? r.sessionTimestamps
      : [],
    itemLastSeen:
      r.itemLastSeen && typeof r.itemLastSeen === "object"
        ? r.itemLastSeen
        : {},
  };
}

export function loadMastery(profileId: string, skill: Skill): MasteryState {
  if (typeof window === "undefined") return emptyMastery(skill);
  migrateLegacyIfPresent(profileId);
  try {
    const raw = window.localStorage.getItem(masteryKey(profileId, skill));
    if (!raw) return emptyMastery(skill);
    return normalizeMastery(JSON.parse(raw), skill);
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

function graduatedKey(profileId: string, skill: Skill): string {
  return `${GRADUATED_PREFIX}.${profileId}.${skill}`;
}

export function hasGraduatedFlag(profileId: string, skill: Skill): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(graduatedKey(profileId, skill)) === "1";
}

export function markGraduated(profileId: string, skill: Skill): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(graduatedKey(profileId, skill), "1");
}

export function purgeProfileStorage(profileId: string): void {
  if (typeof window === "undefined") return;
  const ls = window.localStorage;
  const prefixes = [
    `${MASTERY_PREFIX}.${profileId}`,
    `${GRADUATED_PREFIX}.${profileId}`,
    `${LAST_SESSION_PREFIX}.${profileId}`,
  ];
  const toRemove: string[] = [];
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (!k) continue;
    if (prefixes.some((p) => k === p || k.startsWith(`${p}.`))) {
      toRemove.push(k);
    }
  }
  toRemove.forEach((k) => ls.removeItem(k));
}
