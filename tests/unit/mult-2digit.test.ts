import { describe, expect, it } from "vitest";
import bank from "@/content/math/mult-2digit.json";
import type { MultItem } from "@/lib/types";
import { isArithmeticItem, isItemCorrect } from "@/lib/items";

const items = bank as unknown as readonly MultItem[];

describe("mult_2digit — bank integrity", () => {
  it("bank has ≥ 30 items", () => {
    expect(items.length).toBeGreaterThanOrEqual(30);
  });

  it("all items carry skill=mult_2digit and op=*", () => {
    for (const it of items) {
      expect(it.skill).toBe("mult_2digit");
      expect(it.op).toBe("*");
    }
  });

  it("all IDs are unique and prefixed m2d-", () => {
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.startsWith("m2d-")).toBe(true);
  });

  it("5 difficulty tiers, each ≥ 6 items", () => {
    const byTier: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const it of items)
      byTier[it.difficulty] = (byTier[it.difficulty] ?? 0) + 1;
    for (let d = 1; d <= 5; d++) {
      expect(byTier[d]).toBeGreaterThanOrEqual(6);
    }
  });

  it("every answer equals operand[0] * operand[1]", () => {
    for (const it of items) {
      const [a, b] = it.operands;
      expect(a * b).toBe(it.answer);
    }
  });

  it("every item carries an item-level explanation (CPA scaffold)", () => {
    for (const it of items) {
      expect(it.explanation).toBeTruthy();
      expect((it.explanation ?? "").length).toBeGreaterThan(10);
    }
  });

  it("D1 mixes 2-digit × 1-digit (one operand ≥10, one ≤9)", () => {
    const d1 = items.filter((i) => i.difficulty === 1);
    for (const it of d1) {
      const [a, b] = it.operands;
      const big = Math.max(a, b);
      const small = Math.min(a, b);
      expect(big).toBeGreaterThanOrEqual(10);
      expect(small).toBeLessThanOrEqual(9);
    }
  });

  it("D2–D5 are 2-digit × 2-digit (both operands ≥ 10)", () => {
    const harder = items.filter((i) => i.difficulty >= 2);
    for (const it of harder) {
      const [a, b] = it.operands;
      expect(a).toBeGreaterThanOrEqual(10);
      expect(b).toBeGreaterThanOrEqual(10);
    }
  });
});

describe("mult_2digit — integration with items.ts predicates", () => {
  it("isArithmeticItem returns true for mult_2digit items", () => {
    for (const it of items) {
      expect(isArithmeticItem(it)).toBe(true);
    }
  });

  it("isItemCorrect accepts the canonical numeric answer", () => {
    for (const it of items) {
      expect(isItemCorrect(it, String(it.answer))).toBe(true);
    }
  });

  it("isItemCorrect rejects an off-by-one answer", () => {
    for (const it of items) {
      expect(isItemCorrect(it, String(it.answer + 1))).toBe(false);
    }
  });
});
