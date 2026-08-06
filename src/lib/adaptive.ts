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
export function nextLevel(state: MasteryState): Difficulty {
  const current = state.level ?? 1;
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

// offset — כיוון-קושי ידני מהפרופיל (Marina 2026-08-01). מופחת מהדרגה
// הנוכחית, ולכן הורדה ידנית מחזיקה גם כשהדרגה עצמה זזה.
export function targetDifficulty(
  state: MasteryState,
  offset: number = 0,
): Difficulty {
  const current = state.level ?? 1;
  const clamped = Math.max(1, Math.min(5, current - offset));
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

  const target = targetDifficulty(state, difficultyOffset);

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
