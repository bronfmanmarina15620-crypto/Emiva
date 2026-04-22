import { describe, expect, it } from "vitest";
import bank from "@/content/math/long-division.json";
import type { DivisionItem } from "@/lib/types";
import { isItemCorrect } from "@/lib/items";

const items = bank as unknown as readonly DivisionItem[];

describe("long_division — bank integrity", () => {
  it("bank has ≥ 60 items", () => {
    expect(items.length).toBeGreaterThanOrEqual(60);
  });

  it("all items have skill=long_division and op=/", () => {
    for (const it of items) {
      expect(it.skill).toBe("long_division");
      expect(it.op).toBe("/");
    }
  });

  it("all IDs are unique", () => {
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("5 difficulty tiers, each ≥ 10 items", () => {
    const byTier: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const it of items) byTier[it.difficulty] = (byTier[it.difficulty] ?? 0) + 1;
    for (let d = 1; d <= 5; d++) {
      expect(byTier[d]).toBeGreaterThanOrEqual(10);
    }
  });

  it("every answer is operand[0] / operand[1] (integer, no remainder)", () => {
    for (const it of items) {
      const [a, b] = it.operands;
      expect(a % b).toBe(0);
      expect(a / b).toBe(it.answer);
      expect(Number.isInteger(it.answer)).toBe(true);
    }
  });

  it("all answers are positive integers", () => {
    for (const it of items) {
      expect(it.answer).toBeGreaterThan(0);
      expect(Number.isInteger(it.answer)).toBe(true);
    }
  });

  it("divisors are single-digit (1..9)", () => {
    for (const it of items) {
      const b = it.operands[1];
      expect(b).toBeGreaterThanOrEqual(1);
      expect(b).toBeLessThanOrEqual(9);
    }
  });

  it("prompts match '%d ÷ %d = ?' regex", () => {
    const re = /^\d+ ÷ \d+ = \?$/;
    for (const it of items) expect(it.prompt).toMatch(re);
  });
});

describe("long_division — isItemCorrect integration", () => {
  it("accepts the canonical answer", () => {
    const it = items[0]!;
    expect(isItemCorrect(it, String(it.answer))).toBe(true);
  });

  it("rejects wrong answers", () => {
    const it = items[0]!;
    expect(isItemCorrect(it, String(it.answer + 1))).toBe(false);
    expect(isItemCorrect(it, "")).toBe(false);
    expect(isItemCorrect(it, "abc")).toBe(false);
  });
});
