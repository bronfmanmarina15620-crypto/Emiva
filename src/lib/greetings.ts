/**
 * Session-opening greetings — Hebrew, growth-mindset, time-aware, continuity-aware.
 * Research basis: Responsive Classroom, Reggio Emilia, Dweck, Hattie.
 * No performative enthusiasm. Short. Warm. Varied.
 */

export type TimeOfDay = "morning" | "afternoon" | "evening";
export type Continuity = "first_today" | "returning_same_day" | "after_break" | "new_week";

const MORNING: string[] = [
  "בוקר טוב. מתחילות לאט",
  "בוקר טוב. יום חדש, תרגיל חדש",
  "בוקר טוב. 3 דקות של תרגול",
  "שלום. יום טוב להתחיל",
];

const AFTERNOON: string[] = [
  "היי. ניקח רגע לתרגול",
  "צהריים טובים. נתחיל?",
  "כיף לראות אותך פה",
  "שלום. קצת תרגול ונחזור למה שהיה",
];

const EVENING: string[] = [
  "ערב טוב. תרגול קצר לפני שינה",
  "ערב טוב. בואי נעשה את זה בנחת",
  "היי. כמה דקות ונסיים",
  "ערב רגוע. נתחיל?",
];

const RETURNING_SAME_DAY: string[] = [
  "חזרת — יופי",
  "עוד סיבוב? בואי",
  "טוב שחזרת",
];

const AFTER_BREAK: string[] = [
  "ברוכה השבה. מתחילות לאט",
  "כיף שחזרת. נחדש את הקשר",
  "יופי שחזרת — נתחיל קליל",
];

const NEW_WEEK: string[] = [
  "שבוע טוב. מתחילות רגוע",
  "יום ראשון. שבוע חדש, תרגיל חדש",
  "שבוע טוב. 3 דקות ונתחיל",
];

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
): string {
  const continuity = continuityFrom(lastSessionAt, now);

  let base: string;
  if (continuity === "returning_same_day") base = pick(RETURNING_SAME_DAY, rand);
  else if (continuity === "after_break") base = pick(AFTER_BREAK, rand);
  else if (continuity === "new_week") base = pick(NEW_WEEK, rand);
  else {
    const tod = timeOfDay(now);
    if (tod === "morning") base = pick(MORNING, rand);
    else if (tod === "afternoon") base = pick(AFTERNOON, rand);
    else base = pick(EVENING, rand);
  }

  const trimmed = name?.trim();
  if (!trimmed) return base;
  return `${trimmed}, ${base}`;
}
