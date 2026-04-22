import { describe, expect, it } from "vitest";
import { explain } from "@/lib/explain";
import type { AddSubItem, DivisionItem, MultItem } from "@/lib/types";

function item(
  op: "+" | "-",
  a: number,
  b: number,
  difficulty: AddSubItem["difficulty"] = 1,
): AddSubItem {
  return {
    id: "t",
    skill: "add_sub_100",
    difficulty,
    prompt: `${a} ${op} ${b} = ?`,
    answer: op === "+" ? a + b : a - b,
    operands: [a, b],
    op,
  };
}

function mult(
  a: number,
  b: number,
  difficulty: MultItem["difficulty"] = 3,
): MultItem {
  return {
    id: "tm",
    skill: "multiplication",
    difficulty,
    prompt: `${a} × ${b} = ?`,
    answer: a * b,
    operands: [a, b],
    op: "*",
  };
}

function div(
  a: number,
  b: number,
  difficulty: DivisionItem["difficulty"] = 3,
): DivisionItem {
  return {
    id: "td",
    skill: "long_division",
    difficulty,
    prompt: `${a} ÷ ${b} = ?`,
    answer: a / b,
    operands: [a, b],
    op: "/",
  };
}

describe("explain", () => {
  it("trivial addition under 10", () => {
    const text = explain(item("+", 3, 4));
    expect(text).toContain("= 7");
    expect(text).toContain("3");
    expect(text).toContain("4");
  });

  it("make-10 addition (58+9)", () => {
    const text = explain(item("+", 58, 9, 4));
    expect(text).toContain("58 + 2 = 60");
    expect(text).toContain("60 + 7 = 67");
  });

  it("two-digit addition (37+28)", () => {
    const text = explain(item("+", 37, 28, 5));
    expect(text).toContain("37 + 20 = 57");
    expect(text).toContain("57 + 8 = 65");
  });

  it("addition without carry states the answer", () => {
    const text = explain(item("+", 42, 5, 3));
    expect(text).toContain("42 + 5 = 47");
  });

  it("trivial subtraction under 10", () => {
    const text = explain(item("-", 9, 4));
    expect(text).toContain("= 5");
  });

  it("borrow subtraction (52-6)", () => {
    const text = explain(item("-", 52, 6, 4));
    expect(text).toContain("52 - 2 = 50");
    expect(text).toContain("50 - 4 = 46");
  });

  it("two-digit subtraction (62-35)", () => {
    const text = explain(item("-", 62, 35, 5));
    expect(text).toContain("62 - 30 = 32");
    expect(text).toContain("32 - 5 = 27");
  });

  it("subtraction without borrow", () => {
    const text = explain(item("-", 56, 3, 3));
    expect(text).toContain("56 - 3 = 53");
  });
});

describe("explain — multiplication", () => {
  it("×2 anchor — doubling framing", () => {
    const text = explain(mult(4, 2));
    expect(text).toContain("4 × 2 = 8");
    expect(text).toContain("פי 2");
    expect(text).toContain("4 + 4 = 8");
  });

  it("×2 anchor works when 2 is the first operand (commuted)", () => {
    const text = explain(mult(2, 7));
    expect(text).toContain("2 × 7 = 14");
    expect(text).toContain("פי 2");
    expect(text).toContain("7 + 7 = 14");
  });

  it("×10 anchor — add-zero framing", () => {
    const text = explain(mult(6, 10));
    expect(text).toContain("6 × 10 = 60");
    expect(text).toContain("פי 10");
    expect(text).toContain("0");
  });

  it("×5 anchor — half-of-×10 framing", () => {
    const text = explain(mult(4, 5));
    expect(text).toContain("4 × 5 = 20");
    expect(text).toContain("פי 5");
    expect(text).toContain("4 × 10 = 40");
    expect(text).toContain("חצי");
  });

  it("×9 anchor — ×10 minus one trick", () => {
    const text = explain(mult(7, 9));
    expect(text).toContain("7 × 9 = 63");
    expect(text).toContain("פי 9");
    expect(text).toContain("7 × 10 - 7 = 70 - 7 = 63");
  });

  it("default — skip counting for non-anchor tables", () => {
    const text = explain(mult(3, 7));
    expect(text).toContain("3 × 7 = 21");
    expect(text).toContain("קבוצות");
    expect(text).toContain("7");
    expect(text).toContain("14");
    expect(text).toContain("21");
  });

  it("default — truncates long skip-count lists", () => {
    const text = explain(mult(8, 7));
    expect(text).toContain("8 × 7 = 56");
    expect(text).toContain("...");
  });
});

describe("explain — long_division", () => {
  it("small division uses counting framing", () => {
    const text = explain(div(12, 3));
    expect(text).toContain("12 ÷ 3 = 4");
    expect(text).toContain("3 × 4 = 12");
  });

  it("2-digit division includes verification", () => {
    const text = explain(div(72, 6));
    expect(text).toContain("72 ÷ 6 = 12");
    expect(text).toContain("6 × 12 = 72");
  });

  it("3-digit division mentions long-division steps", () => {
    const text = explain(div(324, 6));
    expect(text).toContain("324 ÷ 6 = 54");
    expect(text).toContain("חילוק ארוך");
    expect(text).toContain("6 × 54 = 324");
  });
});
