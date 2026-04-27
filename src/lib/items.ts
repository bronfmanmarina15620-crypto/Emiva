import type { AddSubItem, DivisionItem, Item, MultItem, Skill } from "./types";
import { isCorrect as isFractionCorrect } from "./fractions";

export function itemSkill(item: Item): Skill {
  return item.skill;
}

export function isArithmeticItem(
  item: Item,
): item is AddSubItem | MultItem | DivisionItem {
  return (
    item.skill === "add_sub_100" ||
    item.skill === "ops_1000" ||
    item.skill === "multiplication" ||
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
  }
}
