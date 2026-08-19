import type { AddressForm } from "./profiles";

/**
 * GENDER-INCLUSIVE-001 G2 — הודעות הפידבק, מודעות ללשון הפנייה.
 *
 * **"ניטרלי קודם".** מחרוזת מנוסחת בלי מגדר כשהטון לא נפגע, ורק
 * מה שלא שורד את הניסוח מפוצל לשתי לשונות. ~60% מהמאגרים כאן
 * היו ניטרליים מלכתחילה בלי שאיש תכנן זאת ("נכון!", "בדיוק!",
 * "כל הכבוד") — הם נשארו בדיוק כפי שהיו.
 *
 * מה שלא ניתן לנטרל בלי לאבד את החום: הזמנות ישירות ("בואי ננסה",
 * "קחי נשימה"). שם הפיצול מוצדק — ניסוח כמו "אפשר לנסות שוב"
 * נכון דקדוקית ומרוחק רגשית, וזה בדיוק מה שכלל-הפדגוגיה אוסר.
 */

type Pools = { neutral: string[]; feminine: string[]; masculine: string[] };

/**
 * בוחר מאגר לפי לשון: הניטרלי תמיד זמין, והמגודר מתווסף רק כשנבחר.
 * כך "בלי להעדיף" מקבל טקסט תקין במקום ברירת-מחדל מגודרת בהסתר.
 */
function poolFor(pools: Pools, form: AddressForm): string[] {
  if (form === "feminine") return [...pools.neutral, ...pools.feminine];
  if (form === "masculine") return [...pools.neutral, ...pools.masculine];
  return pools.neutral;
}

const RETRY_FIRST: Pools = {
  neutral: ["עוד לא — יש עוד ניסיון", "קרוב. ננסה שוב?", "לא נורא, ננסה עוד פעם"],
  feminine: ["כמעט! בואי ננסה שוב"],
  masculine: ["כמעט! בוא ננסה שוב"],
};

const RETRY_LAST: Pools = {
  neutral: ["ניסיון אחרון — אין לחץ", "עוד ניסיון אחד. רגע של נשימה, וקדימה"],
  feminine: ["עוד ניסיון אחד — את יכולה", "קחי נשימה, וננסה עוד פעם"],
  masculine: ["עוד ניסיון אחד — אתה יכול", "קח נשימה, וננסה עוד פעם"],
};

// כבר היה ניטרלי במלואו — לא נגענו. זה גם המאגר בתדירות הגבוהה
// ביותר באפליקציה (נורה על כל תשובה נכונה).
const CORRECT_FIRST_TRY: Pools = {
  neutral: ["נכון! ✨", "יפה מאוד!", "בדיוק!", "כל הכבוד"],
  feminine: [],
  masculine: [],
};

// "התעקשת"/"הצלחת" זהים בשתי הלשונות (עבר, גוף שני) ולכן ניטרליים
// בפועל — דוגמה יפה לכלי הניטרול "זמן עבר".
const CORRECT_AFTER_RETRY: Pools = {
  neutral: [
    "כל הכבוד על ההתמדה!",
    "נכון! התעקשת והצלחת 💪",
    "הצלחת! זה מה שחשוב",
  ],
  feminine: [],
  masculine: [],
};

const REVEAL_INTRO: Pools = {
  neutral: ["הנה הדרך:", "אפשר לפתור ככה:"],
  feminine: ["בואי נפתור יחד:"],
  masculine: ["בוא נפתור יחד:"],
};

// CORE-ENGLISH-VOCAB-EXPLAIN-001 — במילה באנגלית אין מה "לפתור",
// ולכן המאגר המתמטי ("בואי נפתור יחד") לא מתאים לה. כלל הפדגוגיה
// דורש ≥2 וריאציות לכל קטגוריה כדי שלא יישמע רובוטי.
const REVEAL_INTRO_WORD: Pools = {
  // ≥2 גם בניטרלי — כלל הפדגוגיה דורש וריאציות בכל לשון, וילד/ה
  // שבחר/ה "בלי להעדיף" שומע/ת רק את המאגר הזה.
  neutral: ["הנה המילה:", "אפשר להכיר אותה ככה:"],
  feminine: ["בואי נכיר אותה:", "בואי נסתכל עליה יחד:"],
  masculine: ["בוא נכיר אותה:", "בוא נסתכל עליה יחד:"],
};

/**
 * GENDER-INCLUSIVE-001 — טקסטים של **המסך עצמו**, לא של ההודעות.
 *
 * נמצא בסשן חי (Marina, 2026-08-14): פרופיל בלשון זכר קיבל
 * *"מוכנה להתחיל?"*. שתי המחרוזות האלה היו **מקובעות בקוד** של
 * `session/page.tsx` ולא עברו דרך מנגנון לשון-הפנייה כלל — למרות
 * ש-G2 ערכה בדיוק את הקובץ הזה.
 *
 * הלקח: G2 ניטרלה את **ספריות ההודעות** והניחה שזה כל הטקסט.
 * טקסט שיושב ישירות ב-JSX נשאר מחוץ לרשת. לכן הוא מרוכז כאן —
 * מקום אחד, מכוסה בבדיקות, ולא פזור במסכים.
 */
const READY_TO_START: Pools = {
  neutral: ["אפשר להתחיל?", "מתחילים?"],
  feminine: ["מוכנה להתחיל?"],
  masculine: ["מוכן להתחיל?"],
};

const READY_NEXT_STAGE: Pools = {
  neutral: [
    "הגעת ליעד 80% — אפשר לעבור לשלב הבא ✨",
    "הגעת ליעד 80% — השלב הבא מחכה ✨",
  ],
  feminine: ["הגעת ליעד 80% — מוכנה לשלב הבא ✨"],
  masculine: ["הגעת ליעד 80% — מוכן לשלב הבא ✨"],
};

/**
 * GENDER-INCLUSIVE-001 — באנר-התפקיד של העוזר/ת ביומן הגור.
 *
 * נמצא בסקירת-קוד (2026-08-19): הבדיקה `ui-address-form` פטרה את
 * `journal/` בטענה שאלה "מסכי-הורה", אבל יומן הגור הוא **מסך של
 * הילדה** — היא פותחת אותו מכרטיס-הפרופיל שלה במסך הבית. תחת הפטור
 * ישבו שם 8 מחרוזות מגודרות.
 *
 * **רוב המסך נוטרל** (שם-פועל, שם-פעולה, זמן עבר) והמחרוזת הזאת
 * היא היחידה שלא שרדה ניטרול: היא פנייה חמה בשם, ו*"את העוזרת"*
 * הוא לב המסר. *"תפקידך: עזרה"* נכון דקדוקית ומרוחק רגשית —
 * בדיוק מה שכלל-הפדגוגיה אוסר. לכן פיצול, כמו `READY_TO_START`.
 *
 * הניטרלי מנוסח כשותפות (*"אנחנו בפרויקט הזה יחד"*) ולא כתפקיד
 * יבש, כדי שילד/ה שבחר/ה "בלי להעדיף" לא יקבל/תקבל טקסט קר יותר.
 */
const HELPER_ROLE_BANNER: Pools = {
  neutral: [
    "אנחנו בפרויקט הזה יחד. אפשר לרשום איך הלך בכל אימון ולהוסיף עובדות על הגזע.",
    "הפרויקט הזה שלנו יחד. אפשר לרשום איך הלך בכל אימון ולהוסיף עובדות על הגזע.",
  ],
  feminine: [
    "את העוזרת. את יכולה לרשום איך הלך בכל אימון ולהוסיף עובדות על הגזע.",
  ],
  masculine: [
    "אתה העוזר. אתה יכול לרשום איך הלך בכל אימון ולהוסיף עובדות על הגזע.",
  ],
};

function pick<T>(pool: readonly T[], rand: () => number): T {
  const idx = Math.floor(rand() * pool.length);
  return pool[idx] ?? pool[0]!;
}

export function retryMessage(
  attemptsLeft: number,
  rand: () => number = Math.random,
  form: AddressForm = "neutral",
): string {
  return pick(poolFor(attemptsLeft === 1 ? RETRY_LAST : RETRY_FIRST, form), rand);
}

export function correctMessage(
  onFirstTry: boolean,
  rand: () => number = Math.random,
  form: AddressForm = "neutral",
): string {
  return pick(
    poolFor(onFirstTry ? CORRECT_FIRST_TRY : CORRECT_AFTER_RETRY, form),
    rand,
  );
}

/**
 * `kind: "word"` למילים (אנגלית, אוצר-מילים) — שם אין מה לפתור.
 * ברירת-המחדל נשארת המאגר המתמטי, כדי שקוראים קיימים לא ישתנו.
 */
export function revealIntro(
  rand: () => number = Math.random,
  kind: "problem" | "word" = "problem",
  form: AddressForm = "neutral",
): string {
  return pick(poolFor(kind === "word" ? REVEAL_INTRO_WORD : REVEAL_INTRO, form), rand);
}

/** *"מוכן/מוכנה להתחיל?"* — מסך פתיחת הסשן. */
export function readyToStart(
  rand: () => number = Math.random,
  form: AddressForm = "neutral",
): string {
  return pick(poolFor(READY_TO_START, form), rand);
}

/** *"מוכן/מוכנה לשלב הבא"* — מסך סיום, אחרי חציית יעד השליטה. */
export function readyForNextStage(
  rand: () => number = Math.random,
  form: AddressForm = "neutral",
): string {
  return pick(poolFor(READY_NEXT_STAGE, form), rand);
}

/** *"את העוזרת / אתה העוזר"* — באנר התפקיד ביומן הגור. */
export function helperRoleBanner(
  rand: () => number = Math.random,
  form: AddressForm = "neutral",
): string {
  // **לא `poolFor`** — הוא ממזג את הניטרלי לתוך המגודר, וזה נכון
  // לפידבק (גיוון על כל תשובה). כאן זה הופך את המאגר לניטרלי(2) +
  // מגודר(1), כלומר הילדה הייתה מקבלת את *"את העוזרת"* בכשליש
  // מהפעמים — ומבטל בדיוק את הסיבה שהמחרוזת פוצלה במקום לנוטרל
  // (הניטרלי קר יותר). נמצא בסקירת-קוד 2026-08-19.
  //
  // באנר-תפקיד אינו זקוק לגיוון: הוא מוצג פעם אחת, קבוע במסך.
  const own = HELPER_ROLE_BANNER[form];
  return pick(own.length > 0 ? own : HELPER_ROLE_BANNER.neutral, rand);
}

/**
 * לבדיקות בלבד — מאפשר לאמת שכל לשון מקבלת ≥2 וריאציות (כלל
 * הפדגוגיה), בלי לייצא את המאגרים עצמם לשימוש רגיל.
 */
export const __POOLS_FOR_TESTS = {
  READY_TO_START,
  READY_NEXT_STAGE,
  HELPER_ROLE_BANNER,
  RETRY_FIRST,
  RETRY_LAST,
  CORRECT_FIRST_TRY,
  CORRECT_AFTER_RETRY,
  REVEAL_INTRO,
  REVEAL_INTRO_WORD,
  poolFor,
};
