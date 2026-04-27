import type { Skill } from "./types";
import { purgeProfileStorage } from "./storage";
import { clearTelemetry } from "./telemetry";

export type Profile = {
  id: string;
  name: string;
  age: number;
  allowedSkills: Skill[];
  createdAt: number;
};

const PROFILES_KEY = "emiva.profiles.v1";
const ACTIVE_KEY = "emiva.active_profile.v1";

export function allowedSkillsForAge(age: number): Skill[] {
  if (age >= 7 && age <= 8) {
    return ["add_sub_100", "multiplication", "hebrew_comprehension"];
  }
  if (age >= 9 && age <= 10) {
    return ["fractions_intro", "ops_1000", "long_division", "bar_models"];
  }
  return [];
}

// MyLevel §3.1: 7→10–12 דק', 9→15 דק'. Marina chose upper-bound + 3 items
// (2026-04-27). Mapping is items, not minutes — the +3 is intentional buffer
// over MyLevel's time targets, set by parent.
export function itemsPerSessionForAge(age: number): number {
  if (age >= 7 && age <= 8) return 15;
  if (age >= 9 && age <= 10) return 18;
  return 10;
}

export function newProfileId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadProfiles(): Profile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PROFILES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Profile[];
    if (!Array.isArray(arr)) return [];
    // Re-derive allowedSkills from age on every read so curriculum changes
    // propagate to existing profiles without a separate migration step.
    return arr.map((p) => ({ ...p, allowedSkills: allowedSkillsForAge(p.age) }));
  } catch {
    return [];
  }
}

export function saveProfiles(profiles: Profile[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function createProfile(name: string, age: number): Profile {
  const profile: Profile = {
    id: newProfileId(),
    name: name.trim(),
    age,
    allowedSkills: allowedSkillsForAge(age),
    createdAt: Date.now(),
  };
  const all = loadProfiles();
  saveProfiles([...all, profile]);
  return profile;
}

export function setActiveProfileId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id === null) {
    window.localStorage.removeItem(ACTIVE_KEY);
    return;
  }
  window.localStorage.setItem(ACTIVE_KEY, id);
}

export function getActiveProfileId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_KEY);
}

export function getActiveProfile(): Profile | null {
  const id = getActiveProfileId();
  if (!id) return null;
  return loadProfiles().find((p) => p.id === id) ?? null;
}

export function profileAllowsSkill(profile: Profile, skill: Skill): boolean {
  return profile.allowedSkills.includes(skill);
}

export function deleteProfile(id: string): void {
  const remaining = loadProfiles().filter((p) => p.id !== id);
  saveProfiles(remaining);
  if (getActiveProfileId() === id) setActiveProfileId(null);
  purgeProfileStorage(id);
  clearTelemetry(id);
}
