import { describe, expect, it } from "vitest";
import { explain } from "@/lib/explain";
import type { Item } from "@/lib/types";

function item(
  op: "+" | "-",
  a: number,
  b: number,
  difficulty: Item["difficulty"] = 1,
): Item {
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
