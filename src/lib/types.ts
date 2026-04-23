export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type Skill =
  | "add_sub_100"
  | "fractions_intro"
  | "ops_1000"
  | "multiplication"
  | "long_division"
  | "bar_models";

export type AddSubItem = {
  id: string;
  skill: "add_sub_100" | "ops_1000";
  difficulty: Difficulty;
  prompt: string;
  answer: number;
  operands: [number, number];
  op: "+" | "-";
};

export type MultItem = {
  id: string;
  skill: "multiplication";
  difficulty: Difficulty;
  prompt: string;
  answer: number;
  operands: [number, number];
  op: "*";
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
  | "equivalent";

export type FractionViz = { parts: number; filled: number };

export type FractionAnswer =
  | { kind: "choice"; correct: string; options: string[] }
  | { kind: "numeric"; correct: number }
  | { kind: "fraction"; num: number; den: number };

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

export type Item =
  | AddSubItem
  | FractionItem
  | MultItem
  | DivisionItem
  | BarModelItem;

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
