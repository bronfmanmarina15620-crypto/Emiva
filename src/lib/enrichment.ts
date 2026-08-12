import scienceBank from "@/content/enrichment/science.json";
import logicBank from "@/content/enrichment/logic.json";

/**
 * שכבה 2 — Enrichment (MyLevel.docx §1).
 *
 * 🔴 המודול הזה **אינו** מייבא mastery, SRS, adaptive או measurement,
 * וזה מכוון: §1 מגדיר את השכבה כ"לא תרגול שיטתי... אין מבחנים.
 * מדידה: רכה". כל הכלים האלה הם המנוע של שכבה 1 (Core), והבאתם
 * לכאן הייתה מוחקת את ההבדל שבגללו המסמך הפריד בין השכבות.
 *
 * נאכף ב-tests/unit/enrichment.test.ts.
 */

export type EnrichmentTopic = "science" | "logic";

export type AgeBand = "7-8" | "9-10";

export type EnrichmentActivity = {
  readonly id: string;
  readonly topic: EnrichmentTopic;
  readonly ageBand: AgeBand;
  /** כותרת קצרה — השאלה או שם הפעילות. */
  readonly title: string;
  /** מה עושים בפועל. קורה בעולם, לא במסך. */
  readonly activity: string;
  /**
   * ההסבר. §4.1: "הדגש: 'למה זה קורה?' לא 'מה השם של זה?'"
   * מוצג **אחרי** שהילדה ניחשה — Guided Inquiry ואז הסבר ישיר
   * (de Jong 2023, מצוטט ב-§4.1).
   */
  readonly why: string;
  /** משאב חיצוני מ-§4.1 / §4.4. */
  readonly resource: string;
  /** רמז להורה. §4.4: "ההורה משחק/ת איתן — לא מסך בלבד". */
  readonly parentTip: string;
};

const SCIENCE = scienceBank as unknown as readonly EnrichmentActivity[];
const LOGIC = logicBank as unknown as readonly EnrichmentActivity[];

export const ENRICHMENT_TOPICS: readonly EnrichmentTopic[] = [
  "science",
  "logic",
];

export const TOPIC_HEBREW: Record<EnrichmentTopic, string> = {
  science: "מדע",
  logic: "לוגיקה וחידות",
};

export function ageBandFor(age: number): AgeBand {
  return age <= 8 ? "7-8" : "9-10";
}

export function bankFor(topic: EnrichmentTopic): readonly EnrichmentActivity[] {
  return topic === "science" ? SCIENCE : LOGIC;
}

export function activitiesFor(
  topic: EnrichmentTopic,
  age: number,
): readonly EnrichmentActivity[] {
  const band = ageBandFor(age);
  return bankFor(topic).filter((a) => a.ageBand === band);
}

/**
 * מספר השבוע מאז עוגן קבוע. משמש לבחירת פעילות השבוע — כך שכל
 * הבית רואה את אותה פעילות לאורך השבוע, והיא מתחלפת פעם בשבוע
 * (§1: "פעם בשבוע, יום קבוע לנושא").
 */
export function weekIndex(now: number = Date.now()): number {
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  // עוגן: ראשון, 2026-04-19 — תחילת הפרויקט.
  const ANCHOR = Date.UTC(2026, 3, 19);
  return Math.floor((now - ANCHOR) / WEEK_MS);
}

/**
 * הפעילות של השבוע. מחזורית: כשהמאגר נגמר הוא מתחיל מחדש —
 * בניגוד ל-Core, חזרה על ניסוי אינה כשל אלא הזדמנות לעומק.
 */
export function activityOfWeek(
  topic: EnrichmentTopic,
  age: number,
  now: number = Date.now(),
): EnrichmentActivity | null {
  const pool = activitiesFor(topic, age);
  if (pool.length === 0) return null;
  const idx = ((weekIndex(now) % pool.length) + pool.length) % pool.length;
  return pool[idx] as EnrichmentActivity;
}

/** מפתח שבועי לשמירה — `YYYY-Www` בפועל, כאן אינדקס יציב. */
export function weekKey(now: number = Date.now()): string {
  return `w${weekIndex(now)}`;
}
