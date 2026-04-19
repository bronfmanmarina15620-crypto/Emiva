import { describe, expect, it } from "vitest";
import { canonicalAnswer, isItemCorrect, itemSkill } from "@/lib/items";
import type { AddSubItem, FractionItem } from "@/lib/types";

const ADDSUB: AddSubItem = {
  id: "as-1",
  skill: "add_sub_100",
  difficulty: 1,
  prompt: "3 + 4 = ?",
  answer: 7,
  operands: [3, 4],
  op: "+",
};

function fracItem(
  ans: FractionItem["answer"],
  overrides: Partial<FractionItem> = {},
): FractionItem {
  return {
    id: "f-1",
    skill: "fractions_intro",
    difficulty: 1,
    type: "identify",
    prompt: "?",
    answer: ans,
    explanation: "",
    ...overrides,
  };
}

describe("isItemCorrect — add_sub_100", () => {
  it("correct numeric answer → true", () => {
    expect(isItemCorrect(ADDSUB, "7")).toBe(true);
  });
  it("wrong numeric → false", () => {
    expect(isItemCorrect(ADDSUB, "8")).toBe(false);
  });
  it("empty → false", () => {
    expect(isItemCorrect(ADDSUB, "")).toBe(false);
    expect(isItemCorrect(ADDSUB, "   ")).toBe(false);
  });
  it("non-numeric → false", () => {
    expect(isItemCorrect(ADDSUB, "abc")).toBe(false);
    expect(isItemCorrect(ADDSUB, "1/2")).toBe(false);
  });
  it("surrounding whitespace is trimmed", () => {
    expect(isItemCorrect(ADDSUB, " 7 ")).toBe(true);
  });
});

describe("isItemCorrect — fractions_intro (delegation)", () => {
  it("choice item — exact match", () => {
    const item = fracItem({
      kind: "choice",
      correct: "1/2",
      options: ["1/2", "1/4"],
    });
    expect(isItemCorrect(item, "1/2")).toBe(true);
    expect(isItemCorrect(item, "1/4")).toBe(false);
  });
  it("fraction item — accepts equivalent form", () => {
    const item = fracItem({ kind: "fraction", num: 1, den: 2 });
    expect(isItemCorrect(item, "1/2")).toBe(true);
    expect(isItemCorrect(item, "2/4")).toBe(true);
    expect(isItemCorrect(item, "1/3")).toBe(false);
  });
  it("numeric item — exact integer", () => {
    const item = fracItem({ kind: "numeric", correct: 5 });
    expect(isItemCorrect(item, "5")).toBe(true);
    expect(isItemCorrect(item, "4")).toBe(false);
  });
});

describe("canonicalAnswer", () => {
  it("add_sub_100 → numeric as string", () => {
    expect(canonicalAnswer(ADDSUB)).toBe("7");
  });
  it("fractions choice → correct string", () => {
    const item = fracItem({
      kind: "choice",
      correct: "2/3",
      options: ["1/3", "2/3"],
    });
    expect(canonicalAnswer(item)).toBe("2/3");
  });
  it("fractions numeric → stringified number", () => {
    const item = fracItem({ kind: "numeric", correct: 3 });
    expect(canonicalAnswer(item)).toBe("3");
  });
  it("fractions fraction → num/den format", () => {
    const item = fracItem({ kind: "fraction", num: 3, den: 8 });
    expect(canonicalAnswer(item)).toBe("3/8");
  });
});

describe("itemSkill", () => {
  it("returns skill for add_sub_100", () => {
    expect(itemSkill(ADDSUB)).toBe("add_sub_100");
  });
  it("returns skill for fractions_intro", () => {
    const item = fracItem({ kind: "numeric", correct: 1 });
    expect(itemSkill(item)).toBe("fractions_intro");
  });
});
