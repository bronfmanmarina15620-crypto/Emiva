import type { EnrichmentTopic } from "@/lib/enrichment";

/**
 * שכבת התצוגה של לוח השבוע (MyLevel.docx §7).
 *
 * §7 פותח במשפט שקובע את כל אופי המסך: *"זה לא תוכנית ברזל — זה
 * מתווה. יום מחמיצים? לא קטסטרופה. העקביות היא על פני שבועות,
 * לא ימים."* לכן המודול הזה **אינו** מחזיק מצב, אינו מסמן בוצע,
 * ואינו סופר רצפים. הוא מתאר מה מתוכנן — לא בודק מה נעשה.
 *
 * 🔴 אין כאן ייבוא של mastery / telemetry / storage, וזה מכוון:
 * הרגע שבו הלוח יודע מה הילדה עשתה, הוא הופך לצ'קליסט — וצ'קליסט
 * הופך "מתווה" ל"מטלה". נאכף ב-tests/unit/weekly-plan.test.ts.
 */

export type DayId = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type PlanDay = {
  readonly day: DayId;
  readonly name: string;
  /** מיומנויות Core של היום. ריק ביום חופש. */
  readonly core: readonly string[];
  /** נושא ההעשרה של היום, אם יש. */
  readonly enrichment: EnrichmentTopic | null;
  /** תווית עברית לנושא ההעשרה כשאין לו מאגר עדיין (ערבית). */
  readonly enrichmentLabel?: string;
  /** מה קורה ברקע — Ambient. מוצג כטקסט, בלי קישור. */
  readonly ambient: string | null;
  /**
   * יום שבמכוון אין בו כלום. §2 מגדיר זמן ריק כתנאי-סף —
   * *"לפחות שעה ביום ללא פעילות מתוכננת"* — ושבת היא יום שלם כזה.
   * המסך מציג את זה כתוכן, לא כחסר.
   */
  readonly rest: boolean;
};

const HEBREW_DAYS = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת",
] as const;

/**
 * §7.1 — בת 7. כל יום נושא העשרה אחר, וה-Core מתחלף בין
 * אנגלית לעברית.
 */
const PLAN_AGE_7: readonly PlanDay[] = [
  {
    day: 0,
    name: HEBREW_DAYS[0],
    core: ["מתמטיקה", "אנגלית"],
    enrichment: "science",
    ambient: "פלייליסט קלאסי · אחריות על הכלבים · קריאה לפני שינה",
    rest: false,
  },
  {
    day: 1,
    name: HEBREW_DAYS[1],
    core: ["מתמטיקה", "עברית"],
    enrichment: "geography",
    ambient: null,
    rest: false,
  },
  {
    day: 2,
    name: HEBREW_DAYS[2],
    core: ["מתמטיקה", "אנגלית"],
    enrichment: "history",
    ambient: null,
    rest: false,
  },
  {
    day: 3,
    name: HEBREW_DAYS[3],
    core: ["מתמטיקה", "עברית"],
    enrichment: "logic",
    ambient: null,
    rest: false,
  },
  {
    day: 4,
    name: HEBREW_DAYS[4],
    core: ["מתמטיקה", "אנגלית"],
    // ערבית מופיעה בלוח של §7.1 אך אין לה מאגר — היא חסומה על
    // בקרת דוברת (BL-006). מוצגת כמתוכננת ומסומנת כלא-זמינה, ולא
    // מוסתרת: לוח שמסתיר את מה שחסר משקר על התוכנית.
    enrichment: null,
    enrichmentLabel: "ערבית",
    ambient: "פרשת השבוע בארוחת שישי",
    rest: false,
  },
  {
    day: 5,
    name: HEBREW_DAYS[5],
    core: [],
    enrichment: "culture",
    ambient: "זמן ריק + משפחה",
    rest: false,
  },
  {
    day: 6,
    name: HEBREW_DAYS[6],
    core: [],
    enrichment: null,
    ambient: null,
    rest: true,
  },
];

/**
 * §7.2 — בת 9. *"היא עובדת בעיקר דרך פרויקטים"*, ולכן אין כאן
 * נושא-העשרה-ליום אלא פרויקט פעיל שרץ לאורך כל השבוע.
 */
const PLAN_AGE_9: readonly PlanDay[] = [
  ...[0, 1, 2, 3, 4].map(
    (d) =>
      ({
        day: d as DayId,
        name: HEBREW_DAYS[d],
        core: ["מתמטיקה", "אנגלית"],
        enrichment: null,
        enrichmentLabel: "פרויקט פעיל — אילוף בוקר וערב (15 דק' ×2)",
        ambient: "קריאה 20 דק' · פלייליסט",
        rest: false,
      }) as PlanDay,
  ),
  {
    day: 5,
    name: HEBREW_DAYS[5],
    core: [],
    enrichment: null,
    enrichmentLabel: "עבודה על היומן + סיכום שבועי",
    ambient: "משפחה",
    rest: false,
  },
  {
    day: 6,
    name: HEBREW_DAYS[6],
    core: [],
    enrichment: null,
    ambient: null,
    rest: true,
  },
];

export function planForAge(age: number): readonly PlanDay[] {
  return age <= 8 ? PLAN_AGE_7 : PLAN_AGE_9;
}

/**
 * היום בשבוע לפי שעון מקומי. `now` מוזרק לצורך בדיקות —
 * בלי זה כל בדיקה של המסך הייתה תלויה ביום שבו היא רצה.
 */
export function todayIndex(now: Date = new Date()): DayId {
  return now.getDay() as DayId;
}

export function dayFor(age: number, day: DayId): PlanDay {
  return planForAge(age).find((d) => d.day === day) as PlanDay;
}

/**
 * המשפט שנפתח בו המסך. §7 מדגיש שהמתווה גמיש, ולכן הניסוח
 * מזמין ולא מחייב — באותה רוח של `computeActionLine` בדשבורד
 * ההורה (ראי .claude/rules/parent-dashboard-guardrails.md §2).
 */
export function todayHeadline(day: PlanDay): string {
  if (day.rest) return "היום יום ריק — וזה בכוונה.";
  if (day.core.length === 0) return "היום קליל: בלי תרגול.";
  return `היום אפשר: ${day.core.join(" ו")}`;
}
