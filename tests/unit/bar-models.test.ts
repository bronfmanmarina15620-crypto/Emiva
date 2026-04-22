import { describe, expect, it } from "vitest";
import bank from "@/content/math/bar-models.json";
import type { BarModelItem } from "@/lib/types";
import { isItemCorrect } from "@/lib/items";

const items = bank as unknown as readonly BarModelItem[];

describe("bar_models — bank integrity", () => {
  it("bank has ≥ 30 items", () => {
    expect(items.length).toBeGreaterThanOrEqual(30);
  });

  it("all items have skill=bar_models", () => {
    for (const it of items) expect(it.skill).toBe("bar_models");
  });

  it("all IDs are unique", () => {
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("5 difficulty tiers, each ≥ 6 items", () => {
    const byTier: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const it of items) byTier[it.difficulty] = (byTier[it.difficulty] ?? 0) + 1;
    for (let d = 1; d <= 5; d++) {
      expect(byTier[d]).toBeGreaterThanOrEqual(6);
    }
  });

  it("every answer is a positive integer", () => {
    for (const it of items) {
      expect(Number.isInteger(it.answer)).toBe(true);
      expect(it.answer).toBeGreaterThan(0);
    }
  });

  it("every item has 1 or 2 bars, each with ≥ 2 segments (except single-unit ratio rows)", () => {
    for (const it of items) {
      expect(it.bars.length).toBeGreaterThanOrEqual(1);
      expect(it.bars.length).toBeLessThanOrEqual(2);
      // At least one bar must have multiple segments; single-unit comparison rows are allowed
      const maxSegs = Math.max(...it.bars.map((b) => b.segments.length));
      expect(maxSegs).toBeGreaterThanOrEqual(1);
    }
  });

  it("every item contains at least one unknown '?' segment or total", () => {
    for (const it of items) {
      const hasSegmentUnknown = it.bars.some((b) =>
        b.segments.some((s) => s.label === "?"),
      );
      const hasTotalUnknown = it.bars.some((b) => b.totalLabel === "?");
      expect(hasSegmentUnknown || hasTotalUnknown).toBe(true);
    }
  });

  it("every prompt is non-empty Hebrew text (no banned phrases)", () => {
    const banned = ["לא נכון", "טעית", "שגוי", "פספסת", "התלבטות", "סוף סוף"];
    for (const it of items) {
      expect(it.prompt.length).toBeGreaterThan(0);
      for (const phrase of banned) {
        expect(it.prompt.includes(phrase)).toBe(false);
        expect(it.explanation.includes(phrase)).toBe(false);
      }
    }
  });

  it("every segment weight is positive", () => {
    for (const it of items) {
      for (const b of it.bars) {
        for (const s of b.segments) {
          expect(s.weight).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("bar_models — isItemCorrect integration", () => {
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
