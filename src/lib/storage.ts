import type {
  Difficulty,
  ExternalTestResult,
  MasteryState,
  PuppyJournal,
  Skill,
} from "./types";
import { WINDOW_SIZE } from "./types";
import { emptyMastery } from "./mastery";

const MASTERY_PREFIX = "emiva.mastery.v1";
const LAST_SESSION_PREFIX = "emiva.last_session.v1";
const GRADUATED_PREFIX = "emiva.graduated.v1";
const BANK_EXHAUSTED_PREFIX = "emiva.bank_exhausted.v1";
const MEASUREMENT_PREFIX = "emiva.measurement.v1";
/**
 * הפריטים שכבר נשאלו במבחן החיצוני (BL-008). **מפתח נפרד בכוונה**
 * מ-`MEASUREMENT_PREFIX`: התוצאות עצמן נקראות בדשבורד ההורה, ושינוי
 * המבנה שלהן היה מסכן את היסטוריית הבנות. זיכרון-הפריטים הוא מידע
 * תפעולי של ההגרלה בלבד — אם ייעלם, המבחן עדיין עובד.
 */
const MEASUREMENT_SEEN_PREFIX = "emiva.measurement.seen.v1";
const PUPPY_JOURNAL_PREFIX = "emiva.puppy_journal.v1";
const ENRICHMENT_PREFIX = "emiva.enrichment.v1";
// בדיקת התשתית החודשית (§11.2). בניגוד לכל שאר המפתחות — **אינו
// פר-פרופיל**: שינה ויום-ריק הם החלטות של הבית, לא של ילדה.
const FOUNDATION_KEY = "emiva.foundation.v1";

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

const ENGLISH_RESET_FLAG = "emiva.migration.english_shuffle_reset.v1";

/**
 * מיגרציה חד-פעמית (2026-08-06): מאפסת ציוני שליטה באנגלית.
 *
 * עד לתאריך הזה הכפתורים הוצגו בסדר שבו התשובות כתובות בקובץ התוכן,
 * והתשובה הנכונה הייתה כתובה ראשונה כמעט תמיד (99/100 אצל אוולין,
 * 100/100 אצל אמיליה). אפשר היה להגיע ל-100% שליטה בלי לדעת מילה —
 * פשוט ללחוץ תמיד על הכפתור הראשון. לכן כל ציון אנגלית שנצבר לפני
 * התיקון אינו אמין, ובלעדי האיפוס האפליקציה תדלג על מילים שהילדה
 * לא יודעת.
 *
 * רצה פעם אחת בטעינה, מסמנת דגל, ולא נוגעת בשום מיומנות אחרת.
 */
export function runEnglishResetMigration(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(ENGLISH_RESET_FLAG) === "1") return;

    const prefixes = [
      MASTERY_PREFIX,
      GRADUATED_PREFIX,
      BANK_EXHAUSTED_PREFIX,
      MEASUREMENT_PREFIX,
    ];
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (!key.endsWith(".english_vocab")) continue;
      if (!prefixes.some((p) => key.startsWith(p))) continue;
      doomed.push(key);
    }
    for (const key of doomed) window.localStorage.removeItem(key);

    window.localStorage.setItem(ENGLISH_RESET_FLAG, "1");
  } catch {
    // אחסון חסום/מלא — לא מפילים את טעינת האפליקציה בגלל מיגרציה.
  }
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
    // מיגרציה (Marina 2026-08-01): פרופילים שנשמרו לפני מעבר-המדרגות
    // אינם מכילים `level`. לזרוע 1 היה מאפס ילדה ותיקה לקושי הנמוך
    // ביותר, ולכן נגזרת כאן דרגת-פתיחה מהציון הקיים — פעם אחת בלבד,
    // ומכאן ואילך היא זזה במדרגות.
    level: isDifficulty(r.level) ? r.level : seedLevelFromHistory(r),
  };
}

function isDifficulty(v: unknown): v is Difficulty {
  return v === 1 || v === 2 || v === 3 || v === 4 || v === 5;
}

function seedLevelFromHistory(r: Partial<MasteryState>): Difficulty {
  const attempts = Array.isArray(r.attempts) ? r.attempts : [];
  if (attempts.length === 0) return 1;
  const recent = attempts.slice(-WINDOW_SIZE);
  const correct = recent.filter((a) => a.correct).length;
  const score = correct / recent.length;
  // אותה נוסחה ישנה, פעם אחרונה — רק כדי לא לאפס ילדה קיימת.
  const raw = Math.round(score * 5);
  return Math.max(1, Math.min(5, raw || 1)) as Difficulty;
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

function bankExhaustedKey(profileId: string, skill: Skill): string {
  return `${BANK_EXHAUSTED_PREFIX}.${profileId}.${skill}`;
}

export function hasBankExhaustedFlag(profileId: string, skill: Skill): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(bankExhaustedKey(profileId, skill)) === "1";
}

export function markBankExhausted(profileId: string, skill: Skill): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(bankExhaustedKey(profileId, skill), "1");
}

function measurementKey(profileId: string, skill: Skill): string {
  return `${MEASUREMENT_PREFIX}.${profileId}.${skill}`;
}

export function loadMeasurementHistory(
  profileId: string,
  skill: Skill,
): ExternalTestResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(measurementKey(profileId, skill));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ExternalTestResult[]) : [];
  } catch {
    return [];
  }
}

export function appendMeasurementResult(
  profileId: string,
  result: ExternalTestResult,
): void {
  if (typeof window === "undefined") return;
  const history = loadMeasurementHistory(profileId, result.skill);
  history.push(result);
  window.localStorage.setItem(
    measurementKey(profileId, result.skill),
    JSON.stringify(history),
  );
}

function measurementSeenKey(profileId: string, skill: Skill): string {
  return `${MEASUREMENT_SEEN_PREFIX}.${profileId}.${skill}`;
}

/** ה-ids שכבר נשאלו במבחן החיצוני בסבב הנוכחי (BL-008). */
export function loadSeenMeasurementIds(
  profileId: string,
  skill: Skill,
): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(measurementSeenKey(profileId, skill));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * מוסיפה את הפריטים של המבחן שהסתיים לזיכרון.
 *
 * כשהסבב מוצה — כלומר נשאלו כל פריטי המאגר — הזיכרון **מתאפס
 * לפריטי המבחן האחרון בלבד**. כך הסבב הבא מתחיל נקי, אבל המבחן
 * שהילדה בדיוק עשתה עדיין נחשב "נראה" ולא חוזר מיד.
 */
export function appendSeenMeasurementIds(
  profileId: string,
  skill: Skill,
  ids: readonly string[],
  bankSize: number,
): void {
  if (typeof window === "undefined") return;
  const merged = [...loadSeenMeasurementIds(profileId, skill)];
  for (const id of ids) {
    if (!merged.includes(id)) merged.push(id);
  }
  const next = bankSize > 0 && merged.length >= bankSize ? [...ids] : merged;
  try {
    window.localStorage.setItem(
      measurementSeenKey(profileId, skill),
      JSON.stringify(next),
    );
  } catch {
    // אחסון מלא — עדיף לאבד את זיכרון-ההגרלה מאשר להפיל את סיום המבחן.
  }
}

/**
 * שכבת ההעשרה (MyLevel §1, שכבה 2). המדידה כאן **רכה** בכוונה:
 * טקסט חופשי + סימון שקרה, בלי ציון ובלי אחוז. §11.2 שואל רק
 * "האם היו 2 פעילויות העשרה החודש?".
 */
export type EnrichmentEntry = {
  readonly topic: string;
  readonly week: string;
  readonly activityId: string;
  /** "מה היה המעניין ביותר?" — §1, מדידה רכה. */
  readonly note: string;
  readonly done: boolean;
  readonly at: number;
};

function enrichmentKey(profileId: string): string {
  return `${ENRICHMENT_PREFIX}.${profileId}`;
}

export function loadEnrichmentLog(profileId: string): EnrichmentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(enrichmentKey(profileId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EnrichmentEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * שמירה פר (נושא, שבוע): רשומה קיימת מוחלפת, כדי שילדה שמתקנת
 * את מה שכתבה לא תיצור כפילות.
 */
export function saveEnrichmentEntry(
  profileId: string,
  entry: EnrichmentEntry,
): void {
  if (typeof window === "undefined") return;
  const log = loadEnrichmentLog(profileId).filter(
    (e) => !(e.topic === entry.topic && e.week === entry.week),
  );
  log.push(entry);
  window.localStorage.setItem(enrichmentKey(profileId), JSON.stringify(log));
}

// §11.2 — בדיקת התשתית החודשית. הטיפוס יושב כאן ולא ב-foundation.ts
// כדי למנוע תלות מעגלית, כמו EnrichmentEntry למעלה.
export type SleepAnswer = "yes" | "mostly" | "no";
export type BooksAnswer = "none" | "one" | "many";
export type EmptyDayAnswer = "every_week" | "some_weeks" | "none";
export type MoodAnswer = "happy" | "mixed" | "not_happy";

export type FoundationEntry = {
  readonly month: string;
  readonly at: number;
  readonly sleep: SleepAnswer;
  readonly emptyDay: EmptyDayAnswer;
  readonly books: Readonly<Record<string, BooksAnswer>>;
  readonly mood: Readonly<Record<string, MoodAnswer>>;
  readonly note?: string;
};

export function loadFoundationLog(): FoundationEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FOUNDATION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FoundationEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveFoundationLog(log: readonly FoundationEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FOUNDATION_KEY, JSON.stringify(log));
}

function puppyJournalKey(profileId: string): string {
  return `${PUPPY_JOURNAL_PREFIX}.${profileId}`;
}

export function loadPuppyJournal(profileId: string): PuppyJournal | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(puppyJournalKey(profileId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as PuppyJournal;
  } catch {
    return null;
  }
}

export function savePuppyJournal(
  profileId: string,
  journal: PuppyJournal,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    puppyJournalKey(profileId),
    JSON.stringify(journal),
  );
}

export function purgeProfileStorage(profileId: string): void {
  if (typeof window === "undefined") return;
  const ls = window.localStorage;
  const prefixes = [
    `${MASTERY_PREFIX}.${profileId}`,
    `${GRADUATED_PREFIX}.${profileId}`,
    `${LAST_SESSION_PREFIX}.${profileId}`,
    `${BANK_EXHAUSTED_PREFIX}.${profileId}`,
    `${MEASUREMENT_PREFIX}.${profileId}`,
    // מפתח נפרד — אינו נתפס ע"י ה-prefix שמעליו, ובלעדיו זיכרון
    // ההגרלה היה שורד מחיקת פרופיל.
    `${MEASUREMENT_SEEN_PREFIX}.${profileId}`,
    `${PUPPY_JOURNAL_PREFIX}.${profileId}`,
    `${ENRICHMENT_PREFIX}.${profileId}`,
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
