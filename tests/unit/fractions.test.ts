import { describe, expect, it } from "vitest";
import {
  fractionsEqual,
  gcd,
  isCorrect,
  parseFraction,
  reduce,
} from "@/lib/fractions";
import type { FractionItem } from "@/lib/types";

function fracItem(
  kind: "choice" | "numeric" | "fraction",
  opts: Partial<FractionItem> = {},
): FractionItem {
  const base: FractionItem = {
    id: "t-frac",
    skill: "fractions_intro",
    difficulty: 1,
    type: "identify",
    prompt: "t",
    answer: { kind: "fraction", num: 1, den: 2 },
    explanation: "t",
  };
  const ans: FractionItem["answer"] =
    kind === "choice"
      ? { kind: "choice", correct: "1/2", options: ["1/2", "1/4"] }
      : kind === "numeric"
        ? { kind: "numeric", correct: 5 }
        : { kind: "fraction", num: 1, den: 2 };
  return { ...base, answer: ans, ...opts };
}

describe("gcd / reduce", () => {
  it("gcd basics", () => {
    expect(gcd(6, 4)).toBe(2);
    expect(gcd(9, 3)).toBe(3);
    expect(gcd(7, 5)).toBe(1);
  });
  it("reduce 2/4 -> 1/2", () => {
    expect(reduce(2, 4)).toEqual({ num: 1, den: 2 });
  });
  it("reduce 3/9 -> 1/3", () => {
    expect(reduce(3, 9)).toEqual({ num: 1, den: 3 });
  });
  it("reduce already-reduced leaves alone", () => {
    expect(reduce(3, 4)).toEqual({ num: 3, den: 4 });
  });
});

describe("parseFraction", () => {
  it("parses 1/2", () => {
    expect(parseFraction("1/2")).toEqual({ num: 1, den: 2 });
  });
  it("parses 2 / 4 with spaces", () => {
    expect(parseFraction("2 / 4")).toEqual({ num: 2, den: 4 });
  });
  it("rejects non-fraction", () => {
    expect(parseFraction("abc")).toBeNull();
    expect(parseFraction("1")).toBeNull();
    expect(parseFraction("1/0")).toBeNull();
  });
});

describe("fractionsEqual", () => {
  it("2/4 equals 1/2", () => {
    expect(
      fractionsEqual({ num: 2, den: 4 }, { num: 1, den: 2 }),
    ).toBe(true);
  });
  it("3/6 equals 1/2", () => {
    expect(
      fractionsEqual({ num: 3, den: 6 }, { num: 1, den: 2 }),
    ).toBe(true);
  });
  it("1/3 not equal 1/2", () => {
    expect(
      fractionsEqual({ num: 1, den: 3 }, { num: 1, den: 2 }),
    ).toBe(false);
  });
});

describe("isCorrect", () => {
  it("choice — exact match", () => {
    const item = fracItem("choice");
    expect(isCorrect(item, "1/2")).toBe(true);
    expect(isCorrect(item, "1/4")).toBe(false);
  });

  it("numeric — exact match", () => {
    const item = fracItem("numeric");
    expect(isCorrect(item, "5")).toBe(true);
    expect(isCorrect(item, "4")).toBe(false);
    expect(isCorrect(item, "abc")).toBe(false);
  });

  it("fraction — accepts reduced form", () => {
    const item = fracItem("fraction"); // 1/2
    expect(isCorrect(item, "1/2")).toBe(true);
    expect(isCorrect(item, "2/4")).toBe(true);
    expect(isCorrect(item, "3/6")).toBe(true);
    expect(isCorrect(item, "1/3")).toBe(false);
  });

  it("fraction — rejects empty / malformed", () => {
    const item = fracItem("fraction");
    expect(isCorrect(item, "")).toBe(false);
    expect(isCorrect(item, "1")).toBe(false);
    expect(isCorrect(item, "/")).toBe(false);
  });

  it("choice — empty input rejected", () => {
    const item = fracItem("choice");
    expect(isCorrect(item, "")).toBe(false);
  });
});
