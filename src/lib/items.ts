import type { AddSubItem, DivisionItem, Item, MultItem, Skill } from "./types";
import { isCorrect as isFractionCorrect } from "./fractions";

export function itemSkill(item: Item): Skill {
  return item.skill;
}

/**
 * ערבוב יציב של מסיחים: אותו (פריט, שאלה) מקבל תמיד את אותו סדר עבור
 * אותו seed, כדי שהכפתורים לא יקפצו בין ניסיון 1 ל-2 ל-3 — אבל הסדר
 * שונה בין סשנים.
 *
 * חי כאן ולא בדף מסוים בכוונה: ההטיה של 2026-08-06 תוקנה רק בדף
 * התרגול, והמבחן החיצוני — המסך שבו זה הכי קריטי — המשיך לרנדר את
 * הסדר מהקובץ. מקור אחד לכל מסך-בחירה מונע את החזרה השלישית.
 * ראי tests/unit/option-order.test.ts.
 */
export function shuffleOptions(
  options: readonly string[],
  seed: string,
): readonly string[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const copy = [...options];
  for (let i = copy.length - 1; i > 0; i--) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const j = Math.abs(h) % (i + 1);
    const tmp = copy[i] as string;
    copy[i] = copy[j] as string;
    copy[j] = tmp;
  }
  return copy;
}

export function isArithmeticItem(
  item: Item,
): item is AddSubItem | MultItem | DivisionItem {
  return (
    item.skill === "add_sub_100" ||
    item.skill === "ops_1000" ||
    item.skill === "multiplication" ||
    item.skill === "mult_2digit" ||
    item.skill === "long_division"
  );
}

function isNumericIntegerInput(userInput: string, answer: number): boolean {
  const trimmed = userInput.trim();
  if (trimmed === "") return false;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return false;
  return n === answer;
}

export function isItemCorrect(
  item: Item,
  userInput: string,
  questionIndex: 0 | 1 = 0,
): boolean {
  if (isArithmeticItem(item)) {
    return isNumericIntegerInput(userInput, item.answer);
  }
  if (item.skill === "bar_models") {
    return isNumericIntegerInput(userInput, item.answer);
  }
  if (item.skill === "hebrew_comprehension") {
    const q = item.questions[questionIndex];
    return userInput === q.options[q.correctIndex];
  }
  if (item.skill === "english_vocab" || item.skill === "english_phonics") {
    return userInput === item.answer.correct;
  }
  return isFractionCorrect(item, userInput);
}

export function canonicalAnswer(
  item: Item,
  questionIndex: 0 | 1 = 0,
): string {
  if (isArithmeticItem(item)) return String(item.answer);
  if (item.skill === "bar_models") return String(item.answer);
  if (item.skill === "hebrew_comprehension") {
    const q = item.questions[questionIndex];
    return q.options[q.correctIndex];
  }
  switch (item.answer.kind) {
    case "choice":
      return item.answer.correct;
    case "numeric":
      return String(item.answer.correct);
    case "fraction":
      return `${item.answer.num}/${item.answer.den}`;
    case "mixed": {
      const { whole, num, den } = item.answer;
      if (num === 0) return String(whole);
      if (whole === 0) return `${num}/${den}`;
      return `${whole} ${num}/${den}`;
    }
  }
}
