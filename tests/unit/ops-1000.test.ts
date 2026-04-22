import { describe, expect, it } from "vitest";
import bank from "@/content/math/ops-1000.json";
import type { AddSubItem } from "@/lib/types";
import { isItemCorrect } from "@/lib/items";

const items = bank as unknown as readonly AddSubItem[];

describe("ops_1000 — bank integrity", () => {
  it("bank has ≥ 60 items", () => {
    expect(items.length).toBeGreaterThanOrEqual(60);
  });

  it("all items have skill=ops_1000", () => {
    for (const it of items) expect(it.skill).toBe("ops_1000");
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

  it("add/sub balance is roughly 50/50 (±20%)", () => {
    const add = items.filter((i) => i.op === "+").length;
    const sub = items.filter((i) => i.op === "-").length;
    const ratio = add / items.length;
    expect(ratio).toBeGreaterThan(0.3);
    expect(ratio).toBeLessThan(0.7);
    expect(add + sub).toBe(items.length);
  });

  it("every answer is consistent with operands + op (computed check)", () => {
    for (const it of items) {
      const [a, b] = it.operands;
      const expected = it.op === "+" ? a + b : a - b;
      expect(expected).toBe(it.answer);
    }
  });

  it("all answers ∈ [0, 999]", () => {
    for (const it of items) {
      expect(it.answer).toBeGreaterThanOrEqual(0);
      expect(it.answer).toBeLessThanOrEqual(999);
    }
  });

  it("tier 1 items are 3-digit + 1-digit, no carry/borrow", () => {
    for (const it of items.filter((i) => i.difficulty === 1)) {
      const [a, b] = it.operands;
      expect(a).toBeGreaterThanOrEqual(100);
      expect(b).toBeLessThan(10);
    }
  });

  it("tier 5 items involve 3-digit + 3-digit operations", () => {
    for (const it of items.filter((i) => i.difficulty === 5)) {
      const [a, b] = it.operands;
      expect(a).toBeGreaterThanOrEqual(100);
      expect(b).toBeGreaterThanOrEqual(100);
    }
  });

  it("prompts end with '= ?' and are well-formed", () => {
    const re = /^\d+ [+\-] \d+ = \?$/;
    for (const it of items) expect(it.prompt).toMatch(re);
  });
});

describe("ops_1000 — isItemCorrect integration", () => {
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
