import { describe, expect, it } from "vitest";
import addSubBank from "@/content/math/add-sub-100.json";
import multBank from "@/content/math/multiplication.json";
import type { AddSubItem, MultItem } from "@/lib/types";

const addSubItems = addSubBank as unknown as readonly AddSubItem[];
const multItems = multBank as unknown as readonly MultItem[];

const FORBIDDEN_PHRASES = [
  "לא נכון",
  "טעית",
  "טעות",
  "שגוי",
  "פספסת",
  "אחרי התלבטות",
  "סוף סוף",
];

function moneyOf<T extends { context?: string }>(items: readonly T[]): readonly T[] {
  return items.filter((i) => i.context === "money");
}

describe("money-context bank — add_sub_100 (MyLevel §3.1+§5.4)", () => {
  const money = moneyOf(addSubItems);

  it("contains ≥ 30 money items", () => {
    expect(money.length).toBeGreaterThanOrEqual(30);
  });

  it("≥ 6 money items at each difficulty 1–5", () => {
    const byTier: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const i of money) byTier[i.difficulty] = (byTier[i.difficulty] ?? 0) + 1;
    for (let d = 1; d <= 5; d++) {
      expect(byTier[d]).toBeGreaterThanOrEqual(6);
    }
  });

  it("every prompt contains ₪", () => {
    for (const i of money) expect(i.prompt).toContain("₪");
  });

  it("every money item has a non-empty explanation", () => {
    for (const i of money) {
      expect(i.explanation).toBeTruthy();
      expect((i.explanation ?? "").length).toBeGreaterThan(4);
    }
  });

  it("answer = operands[0] op operands[1] for every money item", () => {
    for (const i of money) {
      const [a, b] = i.operands;
      const computed = i.op === "+" ? a + b : a - b;
      expect(computed).toBe(i.answer);
    }
  });

  it("all answers are integers in [0, 100]", () => {
    for (const i of money) {
      expect(Number.isInteger(i.answer)).toBe(true);
      expect(i.answer).toBeGreaterThanOrEqual(0);
      expect(i.answer).toBeLessThanOrEqual(100);
    }
  });

  it("no forbidden growth-mindset phrases in any prompt or explanation", () => {
    for (const i of money) {
      const text = `${i.prompt} ${i.explanation ?? ""}`;
      for (const phrase of FORBIDDEN_PHRASES) {
        expect(text).not.toContain(phrase);
      }
    }
  });

  it("no named character appears in more than 3 prompts", () => {
    const characters = ["סבתא", "סבא", "אבא", "אמא", "אחי", "אחותי", "חברה"];
    for (const ch of characters) {
      const count = money.filter((i) => i.prompt.includes(ch)).length;
      expect(count).toBeLessThanOrEqual(3);
    }
  });
});

describe("money-context bank — multiplication (MyLevel §3.1+§5.4)", () => {
  const money = moneyOf(multItems);

  it("contains ≥ 30 money items", () => {
    expect(money.length).toBeGreaterThanOrEqual(30);
  });

  it("≥ 6 money items at each difficulty 1–5", () => {
    const byTier: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const i of money) byTier[i.difficulty] = (byTier[i.difficulty] ?? 0) + 1;
    for (let d = 1; d <= 5; d++) {
      expect(byTier[d]).toBeGreaterThanOrEqual(6);
    }
  });

  it("every prompt contains ₪", () => {
    for (const i of money) expect(i.prompt).toContain("₪");
  });

  it("every money item has a non-empty explanation", () => {
    for (const i of money) {
      expect(i.explanation).toBeTruthy();
      expect((i.explanation ?? "").length).toBeGreaterThan(4);
    }
  });

  it("answer = operands[0] * operands[1] for every money item", () => {
    for (const i of money) {
      const [a, b] = i.operands;
      expect(a * b).toBe(i.answer);
    }
  });

  it("all answers are integers in [0, 100]", () => {
    for (const i of money) {
      expect(Number.isInteger(i.answer)).toBe(true);
      expect(i.answer).toBeGreaterThanOrEqual(0);
      expect(i.answer).toBeLessThanOrEqual(100);
    }
  });

  it("no forbidden growth-mindset phrases in any prompt or explanation", () => {
    for (const i of money) {
      const text = `${i.prompt} ${i.explanation ?? ""}`;
      for (const phrase of FORBIDDEN_PHRASES) {
        expect(text).not.toContain(phrase);
      }
    }
  });

  it("no named character appears in more than 3 prompts", () => {
    const characters = ["סבתא", "סבא", "אבא", "אמא", "אחי", "אחותי", "חברה", "אצנית"];
    for (const ch of characters) {
      const count = money.filter((i) => i.prompt.includes(ch)).length;
      expect(count).toBeLessThanOrEqual(3);
    }
  });
});
