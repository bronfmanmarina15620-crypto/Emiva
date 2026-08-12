import addSubHoldout from "@/content/measurement/add-sub-100-holdout.json";
import fractionsHoldout from "@/content/measurement/fractions-intro-holdout.json";
import multiplicationHoldout from "@/content/measurement/multiplication-holdout.json";
import ops1000Holdout from "@/content/measurement/ops-1000-holdout.json";
import longDivisionHoldout from "@/content/measurement/long-division-holdout.json";
import mult2digitHoldout from "@/content/measurement/mult-2digit-holdout.json";
import barModelsHoldout from "@/content/measurement/bar-models-holdout.json";
import hebrewCompHoldout from "@/content/measurement/hebrew-comprehension-holdout.json";
import englishVocabHoldout from "@/content/measurement/english-vocab-holdout.json";
import {
  appendMeasurementResult,
  appendSeenMeasurementIds,
  loadMeasurementHistory,
  loadSeenMeasurementIds,
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
const MULTIPLICATION_HOLDOUT = multiplicationHoldout as unknown as readonly Item[];
const OPS_1000_HOLDOUT = ops1000Holdout as unknown as readonly Item[];
const LONG_DIVISION_HOLDOUT = longDivisionHoldout as unknown as readonly Item[];
const MULT_2DIGIT_HOLDOUT = mult2digitHoldout as unknown as readonly Item[];
const BAR_MODELS_HOLDOUT = barModelsHoldout as unknown as readonly Item[];
const HEBREW_COMP_HOLDOUT = hebrewCompHoldout as unknown as readonly Item[];
const ENGLISH_VOCAB_HOLDOUT = englishVocabHoldout as unknown as readonly Item[];

export const MEASURABLE_SKILLS: readonly Skill[] = [
  "add_sub_100",
  "fractions_intro",
  "multiplication",
  "mult_2digit",
  "ops_1000",
  "long_division",
  "bar_models",
  "hebrew_comprehension",
  "english_vocab",
];

export function holdoutForSkill(skill: Skill): readonly Item[] {
  switch (skill) {
    case "add_sub_100":
      return ADD_SUB_HOLDOUT;
    case "fractions_intro":
      return FRACTIONS_HOLDOUT;
    case "multiplication":
      return MULTIPLICATION_HOLDOUT;
    case "mult_2digit":
      return MULT_2DIGIT_HOLDOUT;
    case "ops_1000":
      return OPS_1000_HOLDOUT;
    case "long_division":
      return LONG_DIVISION_HOLDOUT;
    case "bar_models":
      return BAR_MODELS_HOLDOUT;
    case "hebrew_comprehension":
      return HEBREW_COMP_HOLDOUT;
    case "english_vocab":
      return ENGLISH_VOCAB_HOLDOUT;
    default:
      return [];
  }
}

export function hasMeasurement(skill: Skill): boolean {
  return holdoutForSkill(skill).length > 0;
}

function shuffled(items: readonly Item[], rand: () => number): Item[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = pool[i] as Item;
    pool[i] = pool[j] as Item;
    pool[j] = tmp;
  }
  return pool;
}

/**
 * בוחרת פריטים מתוך המאגר בפיזור מאוזן על פני דרגות הקושי.
 *
 * בלי זה כל 10 השאלות יכולות ליפול באותה דרגה, וה-verdict משקף
 * מזל-הגרלה במקום ידע. עוברת סבב-סבב על הדרגות ולוקחת אחת מכל
 * אחת, עד שמגיעים ל-`count`.
 */
function pickSpread(
  items: readonly Item[],
  rand: () => number,
  count: number,
): Item[] {
  const byDifficulty = new Map<number, Item[]>();
  for (const item of shuffled(items, rand)) {
    const bucket = byDifficulty.get(item.difficulty);
    if (bucket) bucket.push(item);
    else byDifficulty.set(item.difficulty, [item]);
  }
  const levels = [...byDifficulty.keys()].sort((a, b) => a - b);
  const picked: Item[] = [];
  while (picked.length < count) {
    let tookAny = false;
    for (const level of levels) {
      if (picked.length >= count) break;
      const bucket = byDifficulty.get(level);
      const next = bucket?.shift();
      if (next) {
        picked.push(next);
        tookAny = true;
      }
    }
    if (!tookAny) break;
  }
  return picked;
}

/**
 * בוחרת את פריטי המבחן החיצוני.
 *
 * **מעדיפה פריטים שהילדה לא ראתה** (BL-008). עד לתיקון הזה כל סיבוב
 * הגריל 10 מתוך 30 מחדש, ובין שני מבחנים עוקבים חזרו בממוצע 3.35
 * שאלות — כלומר שליש מהמבחן בדק שינון במקום העברה, בדיוק ההפך
 * מתפקידו.
 *
 * `seenIds` ריק (או לא מועבר) → התנהגות זהה לקודם.
 * המאגר מוצה → משלימה מהפריטים שנראו, כלומר סבב חדש מתחיל.
 */
export function pickTestItems(
  holdout: readonly Item[],
  rand: () => number = Math.random,
  count: number = MEASUREMENT_TOTAL,
  seenIds: readonly string[] = [],
): readonly Item[] {
  if (holdout.length === 0) return [];
  const target = Math.min(count, holdout.length);
  if (seenIds.length === 0) return pickSpread(holdout, rand, target);

  const seen = new Set(seenIds);
  const fresh = holdout.filter((i) => !seen.has(i.id));
  const picked = pickSpread(fresh, rand, target);
  if (picked.length >= target) return picked;

  // המאגר מוצה — משלימים מהנראים כדי שהמבחן תמיד יהיה באורך מלא.
  const chosen = new Set(picked.map((i) => i.id));
  const rest = holdout.filter((i) => !chosen.has(i.id));
  return [...picked, ...pickSpread(rest, rand, target - picked.length)];
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

/**
 * בוחרת מבחן לפרופיל תוך קריאת זיכרון-הפריטים שלו (BL-008).
 * עוטפת את `pickTestItems` הטהורה — כל הגישה לאחסון מרוכזת כאן,
 * כך שהלוגיקה עצמה נשארת ניתנת לבדיקה בלי דפדפן.
 */
export function pickTestItemsForProfile(
  profileId: string,
  skill: Skill,
  rand: () => number = Math.random,
  count: number = MEASUREMENT_TOTAL,
): readonly Item[] {
  const holdout = holdoutForSkill(skill);
  const seen = loadSeenMeasurementIds(profileId, skill);
  return pickTestItems(holdout, rand, count, seen);
}

/** רושמת את פריטי המבחן שהסתיים, כדי שלא יחזרו בסיבוב הבא. */
export function rememberTestItems(
  profileId: string,
  skill: Skill,
  items: readonly Item[],
): void {
  appendSeenMeasurementIds(
    profileId,
    skill,
    items.map((i) => i.id),
    holdoutForSkill(skill).length,
  );
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
