import { describe, expect, it } from "vitest";
import type { FractionItem } from "@/lib/types";
import { mixedEqual, parseMixed, isCorrect } from "@/lib/fractions";

describe("parseMixed", () => {
  it("parses 'W N/D' form", () => {
    expect(parseMixed("3 1/4")).toEqual({ whole: 3, num: 1, den: 4 });
    expect(parseMixed(" 12  5/8 ")).toEqual({ whole: 12, num: 5, den: 8 });
  });

  it("parses 'W-N/D' form (hyphen)", () => {
    expect(parseMixed("3-1/4")).toEqual({ whole: 3, num: 1, den: 4 });
  });

  it("parses bare fraction as whole=0", () => {
    expect(parseMixed("4/9")).toEqual({ whole: 0, num: 4, den: 9 });
  });

  it("parses bare whole as num=0", () => {
    expect(parseMixed("7")).toEqual({ whole: 7, num: 0, den: 1 });
  });

  it("rejects garbage", () => {
    expect(parseMixed("")).toBeNull();
    expect(parseMixed("abc")).toBeNull();
    expect(parseMixed("3 / 4 / 5")).toBeNull();
    expect(parseMixed("3 1/0")).toBeNull();
  });
});

describe("mixedEqual", () => {
  it("identical mixed numbers", () => {
    expect(
      mixedEqual({ whole: 3, num: 1, den: 4 }, { whole: 3, num: 1, den: 4 }),
    ).toBe(true);
  });

  it("equivalent reduced/unreduced fractions", () => {
    // 3 2/4 == 3 1/2
    expect(
      mixedEqual({ whole: 3, num: 2, den: 4 }, { whole: 3, num: 1, den: 2 }),
    ).toBe(true);
  });

  it("improper vs mixed form", () => {
    // 15/7 == 2 1/7
    expect(
      mixedEqual({ whole: 0, num: 15, den: 7 }, { whole: 2, num: 1, den: 7 }),
    ).toBe(true);
  });

  it("differs when values differ", () => {
    expect(
      mixedEqual({ whole: 3, num: 1, den: 4 }, { whole: 3, num: 1, den: 5 }),
    ).toBe(false);
  });

  it("whole-only equality (4 0/1 == 4)", () => {
    expect(
      mixedEqual({ whole: 4, num: 0, den: 1 }, { whole: 4, num: 0, den: 9 }),
    ).toBe(true);
  });
});

describe("isCorrect for FractionItem with mixed answer", () => {
  const item: FractionItem = {
    id: "test-mixed",
    skill: "fractions_intro",
    difficulty: 3,
    type: "name_to_visual",
    prompt: "4 4/8 - 1 2/8 = ?",
    explanation: "",
    answer: { kind: "mixed", whole: 3, num: 2, den: 8 },
  };

  it("accepts canonical form '3 2/8'", () => {
    expect(isCorrect(item, "3 2/8")).toBe(true);
  });

  it("accepts equivalent reduced form '3 1/4'", () => {
    expect(isCorrect(item, "3 1/4")).toBe(true);
  });

  it("accepts improper form '26/8'", () => {
    expect(isCorrect(item, "26/8")).toBe(true);
  });

  it("rejects wrong answer", () => {
    expect(isCorrect(item, "3 2/9")).toBe(false);
    expect(isCorrect(item, "2 2/8")).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(isCorrect(item, "")).toBe(false);
    expect(isCorrect(item, "three")).toBe(false);
  });

  it("whole-only mixed answer accepts plain whole input", () => {
    const wholeItem: FractionItem = {
      ...item,
      answer: { kind: "mixed", whole: 7, num: 0, den: 1 },
    };
    expect(isCorrect(wholeItem, "7")).toBe(true);
    expect(isCorrect(wholeItem, "7 0/5")).toBe(true);
    expect(isCorrect(wholeItem, "6")).toBe(false);
  });
});
