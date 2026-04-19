import type { Item, Skill } from "./types";
import { isCorrect as isFractionCorrect } from "./fractions";

export function itemSkill(item: Item): Skill {
  return item.skill;
}

export function isItemCorrect(item: Item, userInput: string): boolean {
  if (item.skill === "add_sub_100") {
    const trimmed = userInput.trim();
    if (trimmed === "") return false;
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return false;
    return n === item.answer;
  }
  return isFractionCorrect(item, userInput);
}

export function canonicalAnswer(item: Item): string {
  if (item.skill === "add_sub_100") return String(item.answer);
  switch (item.answer.kind) {
    case "choice":
      return item.answer.correct;
    case "numeric":
      return String(item.answer.correct);
    case "fraction":
      return `${item.answer.num}/${item.answer.den}`;
  }
}
