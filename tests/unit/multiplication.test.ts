import { describe, expect, it } from "vitest";
import bank from "@/content/math/multiplication.json";
import type { MultItem } from "@/lib/types";
import { isItemCorrect } from "@/lib/items";

const items = bank as unknown as readonly MultItem[];

describe("multiplication — bank integrity", () => {
  it("bank has ≥ 60 items", () => {
    expect(items.length).toBeGreaterThanOrEqual(60);
  });

  it("all items have skill=multiplication and op=*", () => {
    for (const it of items) {
      expect(it.skill).toBe("multiplication");
      expect(it.op).toBe("*");
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

  it("every answer is operand[0] * operand[1]", () => {
    for (const it of items) {
      const [a, b] = it.operands;
      expect(a * b).toBe(it.answer);
    }
  });

  it("all operands are in [1, 10]", () => {
    for (const it of items) {
      const [a, b] = it.operands;
      expect(a).toBeGreaterThanOrEqual(1);
      expect(a).toBeLessThanOrEqual(10);
      expect(b).toBeGreaterThanOrEqual(1);
      expect(b).toBeLessThanOrEqual(10);
    }
  });

  it("all answers ∈ [0, 100]", () => {
    for (const it of items) {
      expect(it.answer).toBeGreaterThanOrEqual(0);
      expect(it.answer).toBeLessThanOrEqual(100);
    }
  });

  it("every table from 2 to 10 appears at least once (as either operand)", () => {
    const factorsUsed = new Set<number>();
    for (const it of items) {
      factorsUsed.add(it.operands[0]);
      factorsUsed.add(it.operands[1]);
    }
    for (let t = 2; t <= 10; t++) {
      expect(factorsUsed).toContain(t);
    }
  });

  it("plain prompts match '%d × %d = ?' regex; money prompts contain ₪", () => {
    const plainRe = /^\d+ × \d+ = \?$/;
    for (const it of items) {
      if (it.context === "money") {
        expect(it.prompt).toContain("₪");
        expect(it.explanation).toBeTruthy();
      } else {
        expect(it.prompt).toMatch(plainRe);
      }
    }
  });
});

describe("multiplication — isItemCorrect integration", () => {
  it("accepts the canonical answer", () => {
    const it = items[0]!;
    expect(isItemCorrect(it, String(it.answer))).toBe(true);
  });

  it("rejects off-by-one", () => {
    const it = items[0]!;
    expect(isItemCorrect(it, String(it.answer + 1))).toBe(false);
  });

  it("rejects empty and non-numeric", () => {
    const it = items[0]!;
    expect(isItemCorrect(it, "")).toBe(false);
    expect(isItemCorrect(it, "abc")).toBe(false);
  });
});
