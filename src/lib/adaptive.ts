import type { Difficulty, Item, MasteryState } from "./types";
import {
  LEVEL_CHANGE_MIN_ATTEMPTS,
  LEVEL_DOWN_THRESHOLD,
  MASTERY_TARGET,
  WINDOW_SIZE,
} from "./types";
import { masteryScore } from "./mastery";
import { isDue } from "./srs";

export const DIFFICULTY_TOLERANCE = 1;

export type DesiredContext = "money" | "plain";

// Marina 2026-08-01 — תיקון שורשי.
//
// עד היום: `Math.round(score * 5)` — מיפוי ישיר מהציון לדרגה, בלי זיכרון
// של הדרגה הנוכחית. התוצאה סתרה את MyLevel.docx: 80% ("יעד ההצלחה")
// התמפה לדרגה 4 מתוך 5, כך שילדה שנמצאת בדיוק ביעד נדחפה לקושי
// כמעט-מקסימלי, וכל הצלחה נוספת דחפה עוד. המסמך parent-guide.md §2
// תיאר מלכתחילה מנגנון אחר — מדרגות — שמעולם לא מומש.
//
// מהיום: מדרגות, כפי שהמסמך מבטיח. מעל 80% → +1. מתחת ל-50% → −1.
// באמצע (אזור-היעד) → נשארים. הילדה מתייצבת סביב 80% במקום לקפוץ.
// BL-017 — הגבול בין "נקודת-הפתיחה של ההורה" ל"הדרגה של הילד/ה".
//
// `startingLevel` הוא **ניחוש** של הורה בהרשמה, לפני שנראתה ולו
// תשובה אחת. ברגע שהדרגה נמדדה בפועל, הניחוש הופך למיותר — ומכאן
// ואילך `state.level` הוא מקור-האמת הבלעדי, לתמיד.
//
// **התנאי הוא הדגל `levelMeasured` — לא היסק מערך-הדרגה.**
//
// **שלוש טעויות שנתפסו לפני שהגיעו לילדים** (השלישית בסקירת-קוד,
// אחרי ששתי הראשונות כבר תוקנו — כל אחת נראתה נכונה בזמנה):
//
// 1. *ספירת-ניסיונות* — אחרי 5 ניסיונות המצב הוא
//    `{level: 1, attempts: 5}`: הדרגה עדיין לא זזה, כי `nextLevel`
//    רץ רק **אחרי** הניסיון החמישי. ספירה הייתה מכריזה "יש נתונים",
//    חוזרת לדרגה 1, ומפילה ילד/ה שהתחיל/ה בדרגה 4 לדרגה 2.
// 2. *`level === undefined`* — הייתה הופכת את הפיצ'ר למת, כי
//    `emptyMastery` תמיד כותב 1.
// 3. *`level !== 1`* — נשברה בדיוק במקרה הכי כואב. ילד/ה שההורה
//    אמר/ה עליו/ה "מחפשים אתגר" ומתקשה יורד/ת 5→4→3→2→1 כמו
//    שצריך; ברגע שהגיע/ה ל-1 ההיסק הכריז "אין נתונים", נקודת-
//    הפתיחה חזרה, והילד/ה **הוקפץ/ה בחזרה ל-5** — ונלכד/ה שם.
//    דווקא מי שהכי מתקשה. ילד/ה שההורה דילג/ה עליו/ה קיבל/ה
//    דרגה 1 כמו שצריך, כך שהבאג העניש **רק** את מי שההורה ענה/תה.
//
// המסקנה: ערך-הדרגה הוא מדד מאבד-מידע **בגבול התחתון בלבד**. לכן
// שני תנאים, וכל אחד מספיק:
//
//   1. `levelMeasured` — הדגל המפורש. הוא זה שמכסה את המקרה של
//      דרגה 1, שבו הערך עצמו אינו מבדיל בין "התחלה" ל"ירדנו לכאן".
//   2. דרגה שאינה 1 — עדות עצמאית שמישהו הזיז את הדרגה. נחוץ
//      למצבים שנבנו לפני הדגל ולכל קורא שמרכיב מצב ישירות; בלי זה
//      דרגה שנקבעה במפורש הייתה נדרסת בשקט על ידי ברירת-המחדל.
//      **האחריות על טוהר התנאי הזה היא של הכותב**: `normalizeMastery`
//      מסמן את הדגל רק לדרגה ששמורה בפועל, ולא לדרגה שנגזרה
//      מהיסטוריה — אחרת שני ניסיונות היו מספיקים כדי "לברך" דרגה.
export function hasRealData(state: MasteryState): boolean {
  // דגל מפורש — בשני הכיוונים — מנצח תמיד. `false` מפורש פירושו
  // "נבדק ונקבע שלא נמדד", ואסור להיסק לדרוס אותו.
  if (state.levelMeasured !== undefined) return state.levelMeasured;
  // בלי דגל כלל: נתונים ותיקים מלפני BL-017. כאן **חייבים** שני
  // סימנים, ולא רק דרגה שאינה 1:
  //
  // ילד/ה ותיק/ה שמתקשה יושב/ת על דרגה 1 עם היסטוריה ארוכה. תנאי
  // של "דרגה שאינה 1" בלבד היה מכריז עליו/ה "אין נתונים" ומקפיץ
  // אותו/ה לנקודת-הפתיחה של ההורה — אותה לכידה בדיוק שהדגל בא
  // למנוע, רק על נתונים ישנים (נתפס בסקירה חמישית).
  //
  // היסטוריה ארוכה היא עדות עצמאית: מי שענה/תה על מספיק שאלות
  // כבר נמדד/ה, לא משנה איפה הדרגה נחתה.
  //
  // **חד-משמעית גדול-מ ולא גדול-או-שווה:** בדיוק בסף, `nextLevel`
  // רץ בפעם הראשונה ועדיין **לא** הזיז את הדרגה. שוויון היה מבטל
  // את נקודת-הפתיחה צעד אחד מוקדם מדי, וילד/ה שהתחיל/ה בדרגה 4
  // היה/הייתה מטפס/ת מ-1 (נתפס בשתי בדיקות קיימות).
  if (state.attempts.length > LEVEL_CHANGE_MIN_ATTEMPTS) return true;
  return (state.level ?? 1) !== 1;
}

// startingLevel — נקודת-הפתיחה מהפרופיל (BL-017). מוחלת רק כל עוד
// אין נתונים אמיתיים; ברירת-המחדל 1 משמרת את ההתנהגות הקודמת
// לחלוטין עבור כל קורא שלא מעביר אותה.
export function nextLevel(
  state: MasteryState,
  startingLevel: Difficulty = 1,
): Difficulty {
  // גם כאן ולא רק ב-targetDifficulty: בלעדיו ילד/ה שהתחיל/ה בדרגה 4
  // היה/הייתה מטפס/ת מ-1 בניסיון החמישי — כלומר **צונח/ת לדרגה 2**
  // בדיוק ברגע שההעברה קורית, והפיצ'ר היה מבטל את עצמו.
  const current = hasRealData(state) ? (state.level ?? 1) : startingLevel;
  const recent = state.attempts.slice(-WINDOW_SIZE);
  // מעט מדי נתונים — לא מזיזים דרגה על סמך שאלה או שתיים.
  if (recent.length < LEVEL_CHANGE_MIN_ATTEMPTS) return current;

  const score = masteryScore(state);
  if (score >= MASTERY_TARGET) {
    return Math.min(5, current + 1) as Difficulty;
  }
  if (score < LEVEL_DOWN_THRESHOLD) {
    return Math.max(1, current - 1) as Difficulty;
  }
  return current;
}

/**
 * BL-017 — מקדם את הדרגה **ומסמן שהיא נמדדה**.
 *
 * `nextLevel` מחזיר דרגה בלבד, ולכן מי שקורא לו חייב גם להרים את
 * הדגל. ריכוז שני הצעדים כאן מונע את המצב שבו קורא אחד מעדכן דרגה
 * ושוכח את הדגל — ואז נקודת-הפתיחה חוזרת להשפיע על ילד/ה שכבר
 * נמדד/ה.
 *
 * הדגל עולה רק כשהדרגה באמת חושבה מנתונים (יש מספיק ניסיונות),
 * ולא בכל קריאה — אחרת ילד/ה עם שתי תשובות היה/הייתה מסומן/ת
 * כ"נמדד/ה" ומאבד/ת את נקודת-הפתיחה מיד.
 */
export function advanceLevel(
  state: MasteryState,
  startingLevel: Difficulty = 1,
): MasteryState {
  const level = nextLevel(state, startingLevel);
  // הדגל עולה כשהדרגה באמת חושבה מנתונים — כלומר כש-`nextLevel`
  // עבר את סף-המדגם. מרגע זה נקודת-הפתיחה מפסיקה להשפיע.
  const measuredNow =
    state.attempts.slice(-WINDOW_SIZE).length >= LEVEL_CHANGE_MIN_ATTEMPTS;
  return {
    ...state,
    level,
    levelMeasured: state.levelMeasured === true || measuredNow,
  };
}

// שני כיווני-קושי מהפרופיל, ובכוונה נפרדים:
//
// `startingLevel` (BL-017) — **מאיפה הסולם מתחיל.** נשאל פעם אחת
//   בהרשמה, לפני שההורה ראה את הילד/ה מתרגל/ת, ופג אחרי 5 ניסיונות
//   בכל מיומנות. עונה על "מה הילד/ה כבר יודע/ת?".
//
// `offset` (Marina 2026-08-01) — **תיקון קבוע לסולם.** נקבע במסך
//   העריכה, אחרי שההורה ראה, ולא פג לעולם. עונה על "האם המדידה של
//   האפליקציה מוטה?" (בדרך כלל: ההורה יושב/ת ליד ומסביר/ה).
//
// הם מצטרפים: נקודת-פתיחה 4 עם הורדה של 1 מגישים דרגה 3.
export function targetDifficulty(
  state: MasteryState,
  offset: number = 0,
  startingLevel: Difficulty = 1,
): Difficulty {
  const base = hasRealData(state) ? (state.level ?? 1) : startingLevel;
  const clamped = Math.max(1, Math.min(5, base - offset));
  return clamped as Difficulty;
}

function difficultyDistance(a: Difficulty, b: Difficulty): number {
  return Math.abs(a - b);
}

function staleness(state: MasteryState, itemId: string): number {
  const last = state.itemLastSeen[itemId];
  if (last === undefined) return Number.POSITIVE_INFINITY;
  return state.sessionCount - last;
}

function itemContext(item: Item): "money" | "plain" {
  return "context" in item && item.context === "money" ? "money" : "plain";
}

// Per MyLevel.docx §3.1+§5.4: in each window of 5 items shown to bat-7,
// 3 should be in money context and 2 plain. Caller tracks money/plain
// counts in the current 5-window and asks for the context that keeps
// the ratio.
export function nextDesiredContext(
  moneyShownInWindow: number,
  plainShownInWindow: number,
): DesiredContext | undefined {
  if (moneyShownInWindow >= 3) return "plain";
  if (plainShownInWindow >= 2) return "money";
  return undefined;
}

export function selectNextItem(
  state: MasteryState,
  bank: readonly Item[],
  usedIds: ReadonlySet<string>,
  rand: () => number = Math.random,
  desiredContext?: DesiredContext,
  noRepeatUntilExhausted: boolean = false,
  difficultyOffset: number = 0,
  startingLevel: Difficulty = 1,
): Item | null {
  const unused = bank.filter((i) => !usedIds.has(i.id));
  if (unused.length === 0) return null;

  // Apply context filter; fall back to unfiltered pool if filter empties it,
  // so the session never stalls when the bank is sparse for a context.
  const filtered =
    desiredContext === undefined
      ? unused
      : unused.filter((i) => itemContext(i) === desiredContext);
  const ctxPool = filtered.length > 0 ? filtered : unused;

  // Comprehension policy (per CORE-HEBREW-EVELYN-003): re-reading a text is
  // not retrieval practice — the child memorizes the answer. Restrict to
  // never-seen items when caller asks; fall back to staleness when exhausted.
  const neverSeen = noRepeatUntilExhausted
    ? ctxPool.filter((i) => state.itemLastSeen[i.id] === undefined)
    : ctxPool;
  const pool = neverSeen.length > 0 ? neverSeen : ctxPool;

  const target = targetDifficulty(state, difficultyOffset, startingLevel);

  // Marina 2026-08-01 — לולאת-החזרות.
  //
  // עד היום: `due.length > 0 ? due : pool` — פריטים שהגיע זמנם לחזרה
  // נבחרו לפני שהקושי נלקח בחשבון כלל. כל טעות מאפסת פריט לקופסה 1
  // (חוזר כבר בסשן הבא), ולכן ילדה שמתקשה צוברת ערימת-חזרות של בדיוק
  // מה שנכשלה בו — והערימה חוסמת את ירידת-הדרגה מלהגיע אליה. התוצאה
  // שדווחה: אותה רמה 3 פעמים ויותר, בלי הקלה.
  //
  // מהיום: חזרות עדיין מקבלות עדיפות, אבל רק בתוך טווח הקושי המתאים.
  // אם אין חזרה מתאימה לרמה — עדיף פריט חדש ברמה הנכונה על חזרה
  // שהילדה עוד לא מוכנה אליה.
  const inRange = (i: Item) =>
    difficultyDistance(i.difficulty, target) <= DIFFICULTY_TOLERANCE;
  const dueInRange = pool.filter((i) => isDue(state, i.id) && inRange(i));
  const poolInRange = pool.filter(inRange);
  const candidates =
    dueInRange.length > 0
      ? dueInRange
      : poolInRange.length > 0
        ? poolInRange
        : pool;

  let minDist = Infinity;
  for (const item of candidates) {
    const d = difficultyDistance(item.difficulty, target);
    if (d < minDist) minDist = d;
  }
  const threshold = minDist + DIFFICULTY_TOLERANCE;
  const withinTolerance = candidates.filter(
    (i) => difficultyDistance(i.difficulty, target) <= threshold,
  );

  let maxStale = -Infinity;
  for (const item of withinTolerance) {
    const s = staleness(state, item.id);
    if (s > maxStale) maxStale = s;
  }
  const stalest = withinTolerance.filter(
    (i) => staleness(state, i.id) === maxStale,
  );

  const idx = Math.floor(rand() * stalest.length);
  return stalest[idx] ?? null;
}
