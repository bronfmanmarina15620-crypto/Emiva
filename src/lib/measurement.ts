import addSubHoldout from "@/content/measurement/add-sub-100-holdout.json";
import fractionsHoldout from "@/content/measurement/fractions-intro-holdout.json";
import {
  appendMeasurementResult,
  loadMeasurementHistory,
} from "./storage";
import type {
  ExternalTestResult,
  ExternalTestVerdict,
  Item,
  Skill,
} from "./types";
import {
  MEASUREMENT_GAP_PCT,
  MEASUREMENT_PASSED_PCT,
  MEASUREMENT_RETEST_INTERVAL_MS,
  MEASUREMENT_TOTAL,
} from "./types";

const ADD_SUB_HOLDOUT = addSubHoldout as unknown as readonly Item[];
const FRACTIONS_HOLDOUT = fractionsHoldout as unknown as readonly Item[];

export const MEASURABLE_SKILLS: readonly Skill[] = [
  "add_sub_100",
  "fractions_intro",
];

export function holdoutForSkill(skill: Skill): readonly Item[] {
  switch (skill) {
    case "add_sub_100":
      return ADD_SUB_HOLDOUT;
    case "fractions_intro":
      return FRACTIONS_HOLDOUT;
    default:
      return [];
  }
}

export function hasMeasurement(skill: Skill): boolean {
  return holdoutForSkill(skill).length > 0;
}

export function pickTestItems(
  holdout: readonly Item[],
  rand: () => number = Math.random,
  count: number = MEASUREMENT_TOTAL,
): readonly Item[] {
  if (holdout.length === 0) return [];
  const pool = [...holdout];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = pool[i] as Item;
    pool[i] = pool[j] as Item;
    pool[j] = tmp;
  }
  return pool.slice(0, Math.min(count, pool.length));
}

export function computeVerdict(
  score: number,
  total: number,
): ExternalTestVerdict {
  if (total <= 0) return "false_mastery";
  const pct = (score / total) * 100;
  if (pct >= MEASUREMENT_PASSED_PCT) return "passed";
  if (pct >= MEASUREMENT_GAP_PCT) return "gap";
  return "false_mastery";
}

export function dueForRetest(
  lastAt: number | null,
  now: number = Date.now(),
): boolean {
  if (lastAt === null) return true;
  return now - lastAt >= MEASUREMENT_RETEST_INTERVAL_MS;
}

export function getLastResult(
  profileId: string,
  skill: Skill,
): ExternalTestResult | null {
  const history = loadMeasurementHistory(profileId, skill);
  if (history.length === 0) return null;
  return history.reduce((latest, r) => (r.at > latest.at ? r : latest));
}

export function saveResult(
  profileId: string,
  result: ExternalTestResult,
): void {
  appendMeasurementResult(profileId, result);
}

const VERDICT_HEBREW: Record<ExternalTestVerdict, string> = {
  passed: "השליטה אמיתית — הילדה העבירה את הידע גם לפריטים שלא ראתה.",
  gap: "יש פער בין מה שהאפליקציה מראה לבין מה שמועבר לפריטים חדשים. כדאי להישאר עוד שבועיים על הנושא לפני שעוברים הלאה.",
  false_mastery: "אות לכך שהאפליקציה אולי 'העבירה' את הילדה מהר מדי. כדאי לחזור לרמת קושי נמוכה יותר ולבסס.",
};

export function verdictHebrew(verdict: ExternalTestVerdict): string {
  return VERDICT_HEBREW[verdict];
}

const VERDICT_BADGE: Record<ExternalTestVerdict, string> = {
  passed: "עברה",
  gap: "פער",
  false_mastery: "כדאי לחזק",
};

export function verdictBadge(verdict: ExternalTestVerdict): string {
  return VERDICT_BADGE[verdict];
}
