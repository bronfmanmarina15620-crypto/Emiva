import type { Skill } from "./types";
import type { Profile } from "./profiles";
import { allowedSkillsForAge } from "./profiles";
import { hasGraduatedFlag, loadMastery } from "./storage";
import { SKILL_HEBREW } from "./parent-dashboard";
import { skillNeedsReview } from "./parent-history";

const FOCUS_PREFIX = "emiva.parent_focus.v1";

export type Subject = "math" | "hebrew";

export const SUBJECT_HEBREW: Record<Subject, string> = {
  math: "מתמטיקה",
  hebrew: "קריאה בעברית",
};

export const ALL_SKILLS: Skill[] = [
  "add_sub_100",
  "multiplication",
  "fractions_intro",
  "ops_1000",
  "long_division",
  "bar_models",
  "hebrew_comprehension",
];

export const SKILL_SUBJECT: Record<Skill, Subject> = {
  add_sub_100: "math",
  multiplication: "math",
  fractions_intro: "math",
  ops_1000: "math",
  long_division: "math",
  bar_models: "math",
  hebrew_comprehension: "hebrew",
};

function focusKey(profileId: string): string {
  return `${FOCUS_PREFIX}.${profileId}`;
}

function isSkill(v: unknown): v is Skill {
  return typeof v === "string" && (ALL_SKILLS as string[]).includes(v);
}

export function loadParentFocus(profileId: string): Skill | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(focusKey(profileId));
    if (!raw) return null;
    return isSkill(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveParentFocus(profileId: string, skill: Skill): void {
  if (typeof window === "undefined") return;
  if (!isSkill(skill)) return;
  window.localStorage.setItem(focusKey(profileId), skill);
}

export function clearParentFocus(profileId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(focusKey(profileId));
}

export type EffectiveSource = "manual" | "auto";

export type EffectiveSkill = {
  skill: Skill | null;
  source: EffectiveSource;
};

/**
 * Pure resolver: parent override beats auto-routing.
 * `hasGraduated` is injected so this stays testable without touching storage.
 */
export function resolveEffectiveSkillPure(
  profile: Profile,
  override: Skill | null,
  hasGraduated: (skill: Skill) => boolean,
): EffectiveSkill {
  if (override !== null) return { skill: override, source: "manual" };
  for (const s of profile.allowedSkills) {
    if (!hasGraduated(s)) return { skill: s, source: "auto" };
  }
  const last = profile.allowedSkills[profile.allowedSkills.length - 1];
  return { skill: last ?? null, source: "auto" };
}

export function resolveEffectiveSkill(profile: Profile): EffectiveSkill {
  const override = loadParentFocus(profile.id);
  return resolveEffectiveSkillPure(profile, override, (s) =>
    hasGraduatedFlag(profile.id, s),
  );
}

export type CoverageStatus =
  | "not_started"
  | "in_progress"
  | "mastered"
  | "mastered_review";

export type CoverageRow = {
  skill: Skill;
  skillHebrew: string;
  subject: Subject;
  status: CoverageStatus;
  attempts: number;
  isDefaultForAge: boolean;
  isActive: boolean;
};

export type CoverageBySubject = Array<{
  subject: Subject;
  subjectHebrew: string;
  rows: CoverageRow[];
}>;

const SUBJECT_ORDER: Subject[] = ["math", "hebrew"];

function statusFor(profile: Profile, skill: Skill): CoverageStatus {
  if (hasGraduatedFlag(profile.id, skill)) {
    return skillNeedsReview(profile, skill) ? "mastered_review" : "mastered";
  }
  const m = loadMastery(profile.id, skill);
  return m.attempts.length > 0 ? "in_progress" : "not_started";
}

export function computeCoverage(profile: Profile): CoverageBySubject {
  const defaultForAge = new Set(allowedSkillsForAge(profile.age));
  const active = resolveEffectiveSkill(profile);

  const rowsBySubject = new Map<Subject, CoverageRow[]>();
  for (const subject of SUBJECT_ORDER) rowsBySubject.set(subject, []);

  for (const skill of ALL_SKILLS) {
    const subject = SKILL_SUBJECT[skill];
    const m = loadMastery(profile.id, skill);
    rowsBySubject.get(subject)!.push({
      skill,
      skillHebrew: SKILL_HEBREW[skill],
      subject,
      status: statusFor(profile, skill),
      attempts: m.attempts.length,
      isDefaultForAge: defaultForAge.has(skill),
      isActive: active.skill === skill,
    });
  }

  return SUBJECT_ORDER.map((subject) => ({
    subject,
    subjectHebrew: SUBJECT_HEBREW[subject],
    rows: rowsBySubject.get(subject)!,
  }));
}
