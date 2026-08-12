import scienceBank from "@/content/enrichment/science.json";
import logicBank from "@/content/enrichment/logic.json";
import geographyBank from "@/content/enrichment/geography.json";
import historyBank from "@/content/enrichment/history.json";
import cultureBank from "@/content/enrichment/culture.json";

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

export type EnrichmentTopic =
  | "science"
  | "logic"
  | "geography"
  | "history"
  | "culture";

export type AgeBand = "7-8" | "9-10";

export type EnrichmentActivity = {
  readonly id: string;
  readonly topic: EnrichmentTopic;
  readonly ageBand: AgeBand;
  /** כותרת קצרה — השאלה או שם הפעילות. */
  readonly title: string;
  /** מה עושים בפועל, במשפט אחד. קורה בעולם, לא במסך. */
  readonly activity: string;
  /**
   * מה צריך להכין מראש — הכול מהבית.
   * בלי זה הילדה מגלה באמצע שחסר משהו והפעילות מתה.
   */
  readonly materials?: readonly string[];
  /**
   * שלבים ממוספרים עם כמויות קונקרטיות.
   *
   * 🔴 נוסף 2026-08-12 אחרי ש-Marina ניסתה לקרוא פעילות ולא הבינה
   * מה לעשות ("הדגימי עם שמן, מים וסבון" — בלי כמויות ובלי סדר).
   * `activity` לבדו הוא כותרת, לא הוראה: ילדה בת 9 לא יכולה לבצע
   * ממנו. אם ההורה לא מבינה — הילדה בוודאי לא.
   */
  readonly steps?: readonly string[];
  /**
   * הניחוש **לפני** הבדיקה. §4.1 — Guided Inquiry: קודם מנחשים,
   * אחר כך בודקים, וההסבר מגיע אחרון.
   */
  readonly predict?: string;
  /**
   * מה אמור לקרות — "מה לחפש", לא "התשובה היא X".
   * מונע את "עשינו, לא קרה כלום, נמאס": בלי זה אי אפשר לדעת אם
   * הניסוי נכשל או שפשוט בוצע אחרת. בכוונה **אינו** מסביר למה —
   * ה"למה" נשאר ב-`why`, שמוסתר עד "כבר ניסיתי".
   */
  readonly expected?: string;
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

/**
 * מיפוי מפורש במקום שלישייה (`topic === "science" ? A : B`).
 *
 * הצורה הקודמת עבדה בדיוק לשני נושאים והייתה מחזירה בשקט את מאגר
 * הלוגיקה לכל נושא שלישי — כלומר גיאוגרפיה הייתה מציגה חידות בלי
 * שאף בדיקה תיפול. `Record` על הטיפוס מכריח את TypeScript לדרוש
 * ערך לכל נושא, כך שנושא חדש בלי מאגר אינו מתקמפל.
 */
const BANKS: Record<EnrichmentTopic, readonly EnrichmentActivity[]> = {
  science: scienceBank as unknown as readonly EnrichmentActivity[],
  logic: logicBank as unknown as readonly EnrichmentActivity[],
  geography: geographyBank as unknown as readonly EnrichmentActivity[],
  history: historyBank as unknown as readonly EnrichmentActivity[],
  culture: cultureBank as unknown as readonly EnrichmentActivity[],
};

export const ENRICHMENT_TOPICS: readonly EnrichmentTopic[] = [
  "science",
  "logic",
  "geography",
  "history",
  "culture",
];

export const TOPIC_HEBREW: Record<EnrichmentTopic, string> = {
  science: "מדע",
  logic: "לוגיקה וחידות",
  geography: "גיאוגרפיה",
  history: "היסטוריה",
  culture: "תרבות ישראלית",
};

export function ageBandFor(age: number): AgeBand {
  return age <= 8 ? "7-8" : "9-10";
}

export function bankFor(topic: EnrichmentTopic): readonly EnrichmentActivity[] {
  return BANKS[topic];
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
