const RETRY_FIRST = [
  "כמעט! בואי ננסה שוב",
  "עוד לא — יש לך עוד ניסיון",
  "קרוב. ננסה שוב?",
  "לא נורא, ננסה עוד פעם",
];

const RETRY_LAST = [
  "עוד ניסיון אחד — את יכולה",
  "קחי נשימה, וננסה עוד פעם",
  "ניסיון אחרון — אין לחץ",
];

const CORRECT_FIRST_TRY = [
  "נכון! ✨",
  "יפה מאוד!",
  "בדיוק!",
  "כל הכבוד",
];

const CORRECT_AFTER_RETRY = [
  "נכון! התעקשת והצלחת 💪",
  "כל הכבוד על ההתמדה!",
  "הצלחת! זה מה שחשוב",
];

const REVEAL_INTRO = [
  "בואי נפתור יחד:",
  "הנה הדרך:",
  "אפשר לפתור ככה:",
];

// CORE-ENGLISH-VOCAB-EXPLAIN-001 — במילה באנגלית אין מה "לפתור",
// ולכן המאגר המתמטי ("בואי נפתור יחד") לא מתאים לה. כלל הפדגוגיה
// דורש ≥2 וריאציות לכל קטגוריה כדי שלא יישמע רובוטי.
const REVEAL_INTRO_WORD = [
  "בואי נכיר אותה:",
  "הנה המילה:",
  "בואי נסתכל עליה יחד:",
];

function pick<T>(pool: readonly T[], rand: () => number): T {
  const idx = Math.floor(rand() * pool.length);
  return pool[idx] ?? pool[0]!;
}

export function retryMessage(
  attemptsLeft: number,
  rand: () => number = Math.random,
): string {
  return pick(attemptsLeft === 1 ? RETRY_LAST : RETRY_FIRST, rand);
}

export function correctMessage(
  onFirstTry: boolean,
  rand: () => number = Math.random,
): string {
  return pick(onFirstTry ? CORRECT_FIRST_TRY : CORRECT_AFTER_RETRY, rand);
}

/**
 * `kind: "word"` למילים (אנגלית, אוצר-מילים) — שם אין מה לפתור.
 * ברירת-המחדל נשארת המאגר המתמטי, כדי שקוראים קיימים לא ישתנו.
 */
export function revealIntro(
  rand: () => number = Math.random,
  kind: "problem" | "word" = "problem",
): string {
  return pick(kind === "word" ? REVEAL_INTRO_WORD : REVEAL_INTRO, rand);
}
