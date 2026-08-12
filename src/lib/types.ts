export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type Skill =
  | "add_sub_100"
  | "fractions_intro"
  | "ops_1000"
  | "multiplication"
  | "mult_2digit"
  | "long_division"
  | "bar_models"
  | "hebrew_comprehension"
  | "english_phonics"
  | "english_vocab";

export type AddSubItem = {
  id: string;
  skill: "add_sub_100" | "ops_1000";
  difficulty: Difficulty;
  prompt: string;
  answer: number;
  operands: [number, number];
  op: "+" | "-";
  context?: "money";
  explanation?: string;
};

export type MultItem = {
  id: string;
  skill: "multiplication" | "mult_2digit";
  difficulty: Difficulty;
  prompt: string;
  answer: number;
  operands: [number, number];
  op: "*";
  context?: "money";
  explanation?: string;
};

export type DivisionItem = {
  id: string;
  skill: "long_division";
  difficulty: Difficulty;
  prompt: string;
  answer: number;
  operands: [number, number];
  op: "/";
};

export type BarModelSegment = {
  label: string;
  weight: number;
};

export type BarModelBar = {
  rowLabel?: string;
  segments: BarModelSegment[];
  totalLabel?: string;
};

export type BarModelItem = {
  id: string;
  skill: "bar_models";
  difficulty: Difficulty;
  prompt: string;
  bars: BarModelBar[];
  answer: number;
  explanation: string;
};

export type FractionItemType =
  | "identify"
  | "name_to_visual"
  | "halving"
  | "compare"
  | "equivalent"
  | "arithmetic";

export type FractionViz = { parts: number; filled: number };

export type FractionAnswer =
  | { kind: "choice"; correct: string; options: string[] }
  | { kind: "numeric"; correct: number }
  | { kind: "fraction"; num: number; den: number }
  | { kind: "mixed"; whole: number; num: number; den: number };

export type FractionItem = {
  id: string;
  skill: "fractions_intro";
  difficulty: Difficulty;
  type: FractionItemType;
  prompt: string;
  viz?: FractionViz;
  answer: FractionAnswer;
  explanation: string;
  external_test_eligible?: boolean;
};

// CORE-ENGLISH-001 — English vocabulary as a multiple-choice item.
// Direction: en→he prompts in English with Hebrew choices; he→en the reverse.
export type EnglishVocabItem = {
  id: string;
  skill: "english_vocab";
  difficulty: Difficulty;
  type: "en_to_he" | "he_to_en";
  category: string;
  prompt: string;
  answer: { kind: "choice"; correct: string; options: [string, string, string, string] };
  /**
   * חובה — כלל הפדגוגיה: חשיפה תמיד מלווה בשיטה.
   *
   * CORE-ENGLISH-001 החליטה "אין הסבר, זה אוצר מילים" — נימוק שגוי,
   * כי כלל הפדגוגיה כבר הגדיר שלוש שיטות לא-אלגוריתמיות לאנגלית:
   * פוניקה · קוגנטים · גשר ממילה מוכרת. עד התיקון הבנות ראו
   * "זוהי מילה מקטגוריית abstract" — בלי לימוד, ועם שם קטגוריה
   * באנגלית בתוך משפט עברי (CORE-ENGLISH-VOCAB-EXPLAIN-001).
   *
   * חובה ולא אופציונלי בכוונה: שדה אופציונלי אפשר לשכוח בשקט,
   * ואילו כאן ה-typecheck סופר את כל הפריטים במקומנו.
   */
  explanation: string;
};

// CORE-ENGLISH-PHONICS-001 — פוניקה שיטתית באנגלית.
//
// MyLevel.docx §3.3: "Phonics מפורש (שיטתי, לא Whole Language)".
// CORE-ENGLISH-001 בנתה אוצר-מילים במקום פוניקה, וההנמקה ("הבנות
// קוראות עברית בשטף") הייתה היקש שגוי בין שתי שפות. אווה לא הצליחה
// לקרוא כלום (Marina, 2026-08-10).
//
// חמש הדרגות משקפות את סדר רכישת הקריאה:
//   1 letter_name  — שומעת שם אות → בוחרת את הצורה
//   2 letter_sound — רואה אות → בוחרת את הצליל (עם מילת-עוגן)
//   3 sound_to_letter — שומעת צליל → בוחרת את האות
//   4 blend        — שומעת c-a-t → בוחרת את המילה
//   5 decode       — רואה מילה → בוחרת את המשמעות
export type PhonicsType =
  | "letter_name"
  | "letter_sound"
  | "sound_to_letter"
  | "blend"
  | "decode";

export type EnglishPhonicsItem = {
  id: string;
  skill: "english_phonics";
  difficulty: Difficulty;
  type: PhonicsType;
  /** האות או המילה שהפריט מלמד — למשל "m" או "cat". */
  focus: string;
  /** מילה שמדגימה את הצליל. Marina בחרה את השיטה הזאת (2026-08-10). */
  anchorWord?: string;
  /** לפריטי blend: הצלילים לפני החיבור, למשל ["c","a","t"]. */
  parts?: readonly string[];
  /** מה נאמר בקול כשהילדה לוחצת 🔊. ריק = אין השמעה בפריט הזה. */
  say?: string;
  prompt: string;
  answer: { kind: "choice"; correct: string; options: [string, string, string, string] };
  /** חובה — כלל הפדגוגיה: חשיפה תמיד מלווה בשיטה. */
  explanation: string;
};

export type HebrewCompQuestion = {
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
};

export type HebrewCompItem = {
  id: string;
  skill: "hebrew_comprehension";
  difficulty: Difficulty;
  text: string;
  questions: [HebrewCompQuestion, HebrewCompQuestion];
  // CORE-HEBREW-EMILIA-001: optional metadata for the Emilia bank.
  // Evelyn's existing bank doesn't carry these fields — they're additive only.
  source_type?: "article" | "story";
  topic?: string;
};

export type Item =
  | AddSubItem
  | FractionItem
  | MultItem
  | DivisionItem
  | BarModelItem
  | HebrewCompItem
  | EnglishPhonicsItem
  | EnglishVocabItem;

export type Attempt = {
  itemId: string;
  correct: boolean;
  at: number;
};

export type ItemSrsState = {
  box: 1 | 2 | 3 | 4 | 5;
  sessionsUntilDue: number;
};

export type MasteryState = {
  skill: Skill;
  attempts: Attempt[];
  srs: Record<string, ItemSrsState>;
  sessionCount: number;
  sessionTimestamps: number[];
  itemLastSeen: Record<string, number>;
  // Marina 2026-08-01: הרמה הנוכחית נשמרת כדי שהתקדמות תהיה במדרגות
  // (עולים/יורדים אחת מהמקום הנוכחי) ולא מיפוי-מחדש מהציון בכל שאלה.
  // חסר → מתחילים ב-1, כמו ילדה חדשה.
  level?: Difficulty;
};

export const SRS_INTERVALS: Record<ItemSrsState["box"], number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 8,
  5: 16,
};

export const WINDOW_SIZE = 10;
// MyLevel.docx §שכבה 1: "80% יעד הצלחה" — זה מצב-היעד שבו המערכת
// אמורה להחזיק את הילדה, לא רף שחוצים פעם אחת.
export const MASTERY_TARGET = 0.8;

// גבול תחתון של אזור-היעד. מתחתיו הילדה יורדת דרגה.
// parent-guide.md §2 מבטיח "נשארים בדרגה הנוכחית (או יורדים)" אבל לא
// מגדיר את הגבול; 0.5 נבחר כך שאזור-היעד (50–80%) יהיה רחב מספיק
// שהילדה לא תקפוץ בין דרגות אחרי שאלה בודדת.
export const LEVEL_DOWN_THRESHOLD = 0.5;
// מינימום תשובות לפני שינוי דרגה — בלי זה שאלה ראשונה שגויה
// (ציון 0%) מפילה דרגה מיד.
export const LEVEL_CHANGE_MIN_ATTEMPTS = 5;

// Marina 2026-08-01: סף קבוע של 20 היה שגוי מהיסוד — הוא התעלם מכמה
// שאלות הילדה בכלל מקבלת בסשן. אמיליה (13 שאלות) נדרשה לשני סשנים
// כמעט-מושלמים כדי לעבור נושא, ולכן נתקעה בנושא שכבר שלטה בו.
// הסף נגזר עכשיו מגודל הסשן: סשן מלא אחד.
// ×1.5 נוסה תחילה ונפסל — 13×1.5 מתעגל בחזרה ל-20, כלומר לא שינה כלום
// בדיוק במקרה שבגללו התיקון נעשה. שני התנאים האחרים (2 סשנים, 24 שעות)
// עדיין מונעים מעבר על סמך יום מוצלח בודד.
export const GRADUATION_SESSIONS_WORTH = 1.0;

export function graduationMinCorrect(itemsPerSession: number): number {
  return Math.round(itemsPerSession * GRADUATION_SESSIONS_WORTH);
}

export const GRADUATION_MIN_SESSIONS = 2;
export const GRADUATION_MIN_GAP_MS = 24 * 60 * 60 * 1000;

// Parent dashboard
export const WHEEL_SPIN_MIN_ATTEMPTS = 20;
export const WHEEL_SPIN_MIN_SESSIONS = 3;
export const WHEEL_SPIN_THRESHOLD_PCT = 40;
export const INACTIVITY_DAYS_WATCH = 4;
export const INACTIVITY_DAYS_TALK = 7;
export const WATCH_FIRST_TRY_PCT = 50;
export const WATCH_DROP_DELTA_PCT = 10;
export const DASHBOARD_TIMEOUT_MS = 3 * 60 * 1000;
export const BELIEF_LOW_SAMPLE = 10;
export const BELIEF_WEAK_PCT = 50;
export const TREND_DELTA_PCT = 5;
export const REMINDER_DAYS = 14;
export const MAX_SESSION_MS = 30 * 60 * 1000;

// Parent history — focus-areas thresholds
export const FOCUS_MIN_ATTEMPTS = 10;
export const FOCUS_LOW_PCT_THRESHOLD = 60;
export const FOCUS_DROP_THRESHOLD = 10;
export const FOCUS_NEG_FEELING_SESSIONS = 3;

// FLAGSHIP-PUPPY-001 — Emilia's personal puppy training journal.
// This is not a practice/mastery loop; it's a productivity tool the child
// uses to track her own training work.

// MyLevel §6.2 stage 3 — every command must hold up in three contexts, not
// just at home. Attempts logged before this field existed have no context.
export type PuppyContext = "home" | "outside" | "distractions";

export const PUPPY_CONTEXTS: readonly PuppyContext[] = [
  "home",
  "outside",
  "distractions",
] as const;

export const PUPPY_CONTEXT_HEBREW: Record<PuppyContext, string> = {
  home: "בבית",
  outside: "בחוץ",
  distractions: "עם הפרעות",
};

export type PuppyAttempt = {
  at: number;
  success: boolean;
  notes?: string;
  context?: PuppyContext;
  // §6.3 — Eva logs training results as the helper. Absent = Emilia logged it.
  loggedBy?: string;
};

export type PuppyCommand = {
  id: string;
  hebrewName: string;
  englishName: string;
  addedAt: number;
  targetSessions: number;
  attempts: PuppyAttempt[];
};

export type PuppyFreeNote = {
  id: string;
  at: number;
  text: string;
};

// §6.3 — a fact Eva researched about the breed (3–4 facts is the target).
export type PuppyBreedFact = {
  id: string;
  at: number;
  text: string;
  loggedBy?: string;
};

export type PuppyJournal = {
  puppyName: string;
  puppyBirthday: string | null; // YYYY-MM-DD
  trainingStartDate: number | null; // ms epoch; null = still in planning
  commands: PuppyCommand[];
  freeNotes: PuppyFreeNote[];
  // §6.2 stage 1 — the three method principles, checked off after watching
  // videos and talking about them. Absent on journals created before T8ב.
  methodLearned?: string[];
  // §6.3 — Eva's independent breed research.
  breedName?: string;
  breedFacts?: PuppyBreedFact[];
  // LAUNCH-PUBLIC-001 D1 — who, besides the owner, may open this journal.
  // The helper link must be **explicit**: before this field the helper was
  // handed the first owner-aged journal found on the device, which inside one
  // family is the intended "one puppy, one journal" behaviour but across two
  // families sharing a tablet handed a child a stranger's journal with write
  // access. Absent/empty on journals created before the fix — those keep
  // working, they simply have no helper until the owner invites one.
  helperIds?: string[];
};

// Considered "learned" when the child has practiced at least targetSessions
// times AND the recent success rate is ≥ 80%.
// Kept for journals/attempts that carry no context; §6.2 stage 3 raises the
// bar to PUPPY_MASTERY_SUCCESS_PCT once a command is tested per-context.
export const PUPPY_LEARNED_SUCCESS_PCT = 80;

// MyLevel §6.2 stage 3 — "90% הצלחה ב-3 ההקשרים".
export const PUPPY_MASTERY_SUCCESS_PCT = 90;

// §6.2 stage 1 — the three principles the document names explicitly.
export const PUPPY_METHOD_PRINCIPLES = [
  { id: "positive", hebrew: "חיזוק חיובי", english: "Positive Reinforcement" },
  { id: "consistency", hebrew: "עקביות", english: "Consistency" },
  { id: "patience", hebrew: "סבלנות", english: "Patience" },
] as const;

// §6.2 stage 1 — "בחירת 5–7 פקודות יסוד". Suggestions, not a locked list.
export const PUPPY_SUGGESTED_COMMANDS = [
  { hebrew: "שב", english: "sit" },
  { hebrew: "ארצה", english: "down" },
  { hebrew: "בוא", english: "come" },
  { hebrew: "חכה", english: "wait" },
  { hebrew: "לא", english: "no" },
  { hebrew: "נעצור", english: "stop" },
  { hebrew: "למיטה", english: "bed" },
] as const;

// §6.2 — "פקודה אחת בכל שבוע. לא ממהרים. שליטה קודמת לריבוי."
// Soft guidance (a warning), never a hard block — see plans/FLAGSHIP-PUPPY-002 §2.
export const PUPPY_COMMANDS_PER_WEEK = 1;

// External measurement — per docs/parent-guide.md §6 (MyLevel §11.3)
export type ExternalTestVerdict = "passed" | "gap" | "false_mastery";

export type ExternalTestResult = {
  skill: Skill;
  score: number;
  total: number;
  verdict: ExternalTestVerdict;
  at: number;
};

export const MEASUREMENT_TOTAL = 10;
export const MEASUREMENT_PASSED_PCT = 80;
export const MEASUREMENT_GAP_PCT = 60;
export const MEASUREMENT_RETEST_INTERVAL_MS = 42 * 24 * 60 * 60 * 1000;
