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
};

export const SRS_INTERVALS: Record<ItemSrsState["box"], number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 8,
  5: 16,
};

export const WINDOW_SIZE = 10;
export const MASTERY_TARGET = 0.8;

export const GRADUATION_MIN_CORRECT = 20;
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

export type PuppyAttempt = {
  at: number;
  success: boolean;
  notes?: string;
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

export type PuppyJournal = {
  puppyName: string;
  puppyBirthday: string | null; // YYYY-MM-DD
  trainingStartDate: number | null; // ms epoch; null = still in planning
  commands: PuppyCommand[];
  freeNotes: PuppyFreeNote[];
};

// Considered "learned" when the child has practiced at least targetSessions
// times AND the recent success rate is ≥ 80%.
export const PUPPY_LEARNED_SUCCESS_PCT = 80;

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
