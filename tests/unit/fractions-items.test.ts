import { describe, expect, it } from "vitest";
import bank from "@/content/math/fractions-intro.json";
import type { FractionItem } from "@/lib/types";

const ITEMS = bank as unknown as FractionItem[];

describe("fractions-intro bank integrity", () => {
  it("has at least 25 items", () => {
    expect(ITEMS.length).toBeGreaterThanOrEqual(25);
  });

  it("all items have skill=fractions_intro", () => {
    for (const item of ITEMS) {
      expect(item.skill).toBe("fractions_intro");
    }
  });

  it("all item ids are unique", () => {
    const ids = ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers all 5 difficulty tiers", () => {
    const difficulties = new Set(ITEMS.map((i) => i.difficulty));
    expect(difficulties.size).toBe(5);
    for (const d of [1, 2, 3, 4, 5]) {
      expect(difficulties.has(d as 1 | 2 | 3 | 4 | 5)).toBe(true);
    }
  });

  it("has ≥ 4 items per type", () => {
    const byType = new Map<string, number>();
    for (const item of ITEMS) {
      byType.set(item.type, (byType.get(item.type) ?? 0) + 1);
    }
    for (const type of [
      "identify",
      "name_to_visual",
      "halving",
      "compare",
      "equivalent",
    ]) {
      const count = byType.get(type) ?? 0;
      expect(count, `${type} count`).toBeGreaterThanOrEqual(4);
    }
  });

  it("halving items use whole-number answers (no decimals in slice 1)", () => {
    const halvings = ITEMS.filter((i) => i.type === "halving");
    for (const item of halvings) {
      expect(item.answer.kind).toBe("numeric");
      if (item.answer.kind === "numeric") {
        expect(Number.isInteger(item.answer.correct)).toBe(true);
      }
    }
  });

  it("choice items have correct as one of options", () => {
    for (const item of ITEMS) {
      if (item.answer.kind === "choice") {
        expect(item.answer.options).toContain(item.answer.correct);
      }
    }
  });

  it("no banned phrases in prompts or explanations", () => {
    const banned = [
      "לא נכון",
      "טעית",
      "שגוי",
      "פספסת",
      "התלבטות",
      "סוף סוף",
    ];
    for (const item of ITEMS) {
      for (const phrase of banned) {
        expect(item.prompt.includes(phrase), `${item.id} prompt`).toBe(false);
        expect(
          item.explanation.includes(phrase),
          `${item.id} explanation`,
        ).toBe(false);
      }
    }
  });
});
