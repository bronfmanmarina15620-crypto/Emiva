import { describe, expect, it } from "vitest";
import {
  canonicalAnswer,
  isArithmeticItem,
  isItemCorrect,
  itemSkill,
} from "@/lib/items";
import type {
  AddSubItem,
  DivisionItem,
  FractionItem,
  MultItem,
} from "@/lib/types";

const ADDSUB: AddSubItem = {
  id: "as-1",
  skill: "add_sub_100",
  difficulty: 1,
  prompt: "3 + 4 = ?",
  answer: 7,
  operands: [3, 4],
  op: "+",
};

const OPS1K: AddSubItem = {
  id: "ops-1",
  skill: "ops_1000",
  difficulty: 5,
  prompt: "347 + 256 = ?",
  answer: 603,
  operands: [347, 256],
  op: "+",
};

const MULT: MultItem = {
  id: "mult-1",
  skill: "multiplication",
  difficulty: 3,
  prompt: "6 × 7 = ?",
  answer: 42,
  operands: [6, 7],
  op: "*",
};

const DIV: DivisionItem = {
  id: "div-1",
  skill: "long_division",
  difficulty: 4,
  prompt: "144 ÷ 6 = ?",
  answer: 24,
  operands: [144, 6],
  op: "/",
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
  it("returns skill for ops_1000", () => {
    expect(itemSkill(OPS1K)).toBe("ops_1000");
  });
});

describe("isArithmeticItem — narrowing", () => {
  it("true for add_sub_100", () => {
    expect(isArithmeticItem(ADDSUB)).toBe(true);
  });
  it("true for ops_1000", () => {
    expect(isArithmeticItem(OPS1K)).toBe(true);
  });
  it("true for multiplication", () => {
    expect(isArithmeticItem(MULT)).toBe(true);
  });
  it("true for long_division", () => {
    expect(isArithmeticItem(DIV)).toBe(true);
  });
  it("false for fractions_intro", () => {
    expect(isArithmeticItem(fracItem({ kind: "numeric", correct: 1 }))).toBe(false);
  });
});

describe("isItemCorrect — ops_1000", () => {
  it("correct numeric answer → true", () => {
    expect(isItemCorrect(OPS1K, "603")).toBe(true);
  });
  it("wrong numeric → false", () => {
    expect(isItemCorrect(OPS1K, "602")).toBe(false);
  });
  it("whitespace trimmed", () => {
    expect(isItemCorrect(OPS1K, " 603 ")).toBe(true);
  });
});

describe("canonicalAnswer — ops_1000", () => {
  it("returns stringified answer", () => {
    expect(canonicalAnswer(OPS1K)).toBe("603");
  });
});

describe("isItemCorrect — multiplication", () => {
  it("correct numeric answer → true", () => {
    expect(isItemCorrect(MULT, "42")).toBe(true);
  });
  it("wrong → false", () => {
    expect(isItemCorrect(MULT, "41")).toBe(false);
    expect(isItemCorrect(MULT, "")).toBe(false);
    expect(isItemCorrect(MULT, "abc")).toBe(false);
  });
});

describe("canonicalAnswer — multiplication", () => {
  it("returns stringified answer", () => {
    expect(canonicalAnswer(MULT)).toBe("42");
  });
});

describe("isItemCorrect — long_division", () => {
  it("correct numeric answer → true", () => {
    expect(isItemCorrect(DIV, "24")).toBe(true);
  });
  it("wrong → false", () => {
    expect(isItemCorrect(DIV, "23")).toBe(false);
    expect(isItemCorrect(DIV, "")).toBe(false);
    expect(isItemCorrect(DIV, "abc")).toBe(false);
  });
});

describe("canonicalAnswer — long_division", () => {
  it("returns stringified answer", () => {
    expect(canonicalAnswer(DIV)).toBe("24");
  });
});
