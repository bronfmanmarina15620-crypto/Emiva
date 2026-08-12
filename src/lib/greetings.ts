/**
 * Session-opening greetings — Hebrew, growth-mindset, time-aware, continuity-aware.
 * Research basis: Responsive Classroom, Reggio Emilia, Dweck, Hattie.
 * No performative enthusiasm. Short. Warm. Varied.
 */

import type { AddressForm } from "./profiles";

export type TimeOfDay = "morning" | "afternoon" | "evening";
export type Continuity = "first_today" | "returning_same_day" | "after_break" | "new_week";

/**
 * GENDER-INCLUSIVE-001 G2 — ברכות מודעות ללשון הפנייה.
 *
 * ⚠️ **"מתחילות לאט" אינו ניטרלי** — זה רבים בנקבה, כלומר מגדר
 * בתחפושת. הוא נראה מכליל ("אנחנו יחד") אבל מסגיר מין, ולכן עבר
 * לרשימה המגודרת ולא לניטרלית. זו בדיוק הטעות שקל ליפול בה
 * כשמנטרלים בעברית.
 */
type Pools = { neutral: string[]; feminine: string[]; masculine: string[] };

const MORNING: Pools = {
  neutral: [
    "בוקר טוב. יום חדש, תרגיל חדש",
    "בוקר טוב. 3 דקות של תרגול",
    "שלום. יום טוב להתחיל",
  ],
  feminine: ["בוקר טוב. מתחילות לאט"],
  masculine: ["בוקר טוב. מתחילים לאט"],
};

const AFTERNOON: Pools = {
  neutral: [
    "היי. ניקח רגע לתרגול",
    "צהריים טובים. נתחיל?",
    "כיף לראות אותך פה",
    "שלום. קצת תרגול ונחזור למה שהיה",
  ],
  feminine: [],
  masculine: [],
};

const EVENING: Pools = {
  neutral: [
    "ערב טוב. תרגול קצר לפני שינה",
    "היי. כמה דקות ונסיים",
    "ערב רגוע. נתחיל?",
  ],
  feminine: ["ערב טוב. בואי נעשה את זה בנחת"],
  masculine: ["ערב טוב. בוא נעשה את זה בנחת"],
};

const RETURNING_SAME_DAY: Pools = {
  // "חזרת" זהה בשתי הלשונות — זמן עבר, גוף שני.
  neutral: ["חזרת — יופי", "טוב שחזרת"],
  feminine: ["עוד סיבוב? בואי"],
  masculine: ["עוד סיבוב? בוא"],
};

const AFTER_BREAK: Pools = {
  neutral: ["כיף שחזרת. נחדש את הקשר", "יופי שחזרת — נתחיל קליל"],
  feminine: ["ברוכה השבה. מתחילות לאט"],
  masculine: ["ברוך השב. מתחילים לאט"],
};

const NEW_WEEK: Pools = {
  neutral: [
    "יום ראשון. שבוע חדש, תרגיל חדש",
    "שבוע טוב. 3 דקות ונתחיל",
  ],
  feminine: ["שבוע טוב. מתחילות רגוע"],
  masculine: ["שבוע טוב. מתחילים רגוע"],
};

function poolFor(pools: Pools, form: AddressForm): string[] {
  if (form === "feminine") return [...pools.neutral, ...pools.feminine];
  if (form === "masculine") return [...pools.neutral, ...pools.masculine];
  return pools.neutral;
}

function pick<T>(pool: readonly T[], rand: () => number): T {
  const idx = Math.floor(rand() * pool.length);
  return pool[idx] ?? pool[0]!;
}

export function timeOfDay(date: Date = new Date()): TimeOfDay {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  return "evening";
}

export function continuityFrom(
  lastSessionAt: number | null,
  now: Date = new Date(),
): Continuity {
  if (lastSessionAt === null) return "first_today";
  const ageMs = now.getTime() - lastSessionAt;
  const day = 24 * 60 * 60 * 1000;

  if (ageMs < 8 * 60 * 60 * 1000) return "returning_same_day";
  if (ageMs >= 4 * day) return "after_break";
  if (now.getDay() === 0 && ageMs >= 1 * day) return "new_week";
  return "first_today";
}

export function buildGreeting(
  lastSessionAt: number | null,
  name: string | null = null,
  now: Date = new Date(),
  rand: () => number = Math.random,
  form: AddressForm = "neutral",
): string {
  const continuity = continuityFrom(lastSessionAt, now);
  const from = (p: Pools) => pick(poolFor(p, form), rand);

  let base: string;
  if (continuity === "returning_same_day") base = from(RETURNING_SAME_DAY);
  else if (continuity === "after_break") base = from(AFTER_BREAK);
  else if (continuity === "new_week") base = from(NEW_WEEK);
  else {
    const tod = timeOfDay(now);
    if (tod === "morning") base = from(MORNING);
    else if (tod === "afternoon") base = from(AFTERNOON);
    else base = from(EVENING);
  }

  const trimmed = name?.trim();
  if (!trimmed) return base;
  return `${trimmed}, ${base}`;
}

/** לבדיקות בלבד — לאימות ≥2 וריאציות בכל לשון. */
export const __GREETING_POOLS_FOR_TESTS = {
  MORNING,
  AFTERNOON,
  EVENING,
  RETURNING_SAME_DAY,
  AFTER_BREAK,
  NEW_WEEK,
  poolFor,
};
