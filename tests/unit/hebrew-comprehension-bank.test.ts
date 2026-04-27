import { describe, expect, it } from "vitest";
import bank from "@/content/hebrew/comprehension-evelyn.json";
import type { HebrewCompItem } from "@/lib/types";
import { isItemCorrect, canonicalAnswer, itemSkill } from "@/lib/items";

const items = bank as unknown as readonly HebrewCompItem[];

const FORBIDDEN_PHRASES = [
  "לא נכון",
  "טעית",
  "טעות",
  "שגוי",
  "פספסת",
  "אחרי התלבטות",
  "סוף סוף",
];

describe("hebrew_comprehension — bank integrity", () => {
  it("contains ≥ 30 items", () => {
    expect(items.length).toBeGreaterThanOrEqual(30);
  });

  it("≥ 6 items at each difficulty 1–5", () => {
    const byTier: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const i of items) byTier[i.difficulty] = (byTier[i.difficulty] ?? 0) + 1;
    for (let d = 1; d <= 5; d++) {
      expect(byTier[d]).toBeGreaterThanOrEqual(6);
    }
  });

  it("every item has skill=hebrew_comprehension and exactly 2 questions", () => {
    for (const i of items) {
      expect(i.skill).toBe("hebrew_comprehension");
      expect(i.questions.length).toBe(2);
    }
  });

  it("every text is at least 30 chars (substantive paragraph)", () => {
    for (const i of items) {
      expect(i.text.length).toBeGreaterThanOrEqual(30);
    }
  });

  it("every question has 4 unique options + valid correctIndex + non-empty explanation", () => {
    for (const i of items) {
      for (const q of i.questions) {
        expect(q.options.length).toBe(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThanOrEqual(3);
        expect(q.explanation).toBeTruthy();
        expect(q.explanation.length).toBeGreaterThan(4);
        expect(q.question).toBeTruthy();
      }
    }
  });

  it("all IDs are unique", () => {
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("no forbidden growth-mindset phrases in any text/question/options/explanation", () => {
    for (const i of items) {
      const allText = [
        i.text,
        ...i.questions.flatMap((q) => [
          q.question,
          ...q.options,
          q.explanation,
        ]),
      ].join(" ");
      for (const phrase of FORBIDDEN_PHRASES) {
        expect(allText).not.toContain(phrase);
      }
    }
  });

  it("no named character appears as a standalone token in more than 4 items", () => {
    // Hebrew has no \b word boundary; tokenize by non-letter separators and
    // check exact token match. Avoids false positives from substring matches
    // (e.g. "לי" the name vs "לי" as the preposition "to me").
    const characters = [
      "סבתא",
      "סבא",
      "אבא",
      "אמא",
      "תמר",
      "דני",
      "מאיה",
      "אורית",
      "שירה",
      "ניר",
      "רמי",
      "סיון",
      "דנה",
      "ירון",
      "רוני",
      "ענת",
      "גלית",
      "מיכל",
      "אריאל",
      "תהילה",
      "דרור",
      "נעמה",
      "איתי",
      "עמית",
    ];
    const tokenize = (s: string) => s.split(/[\s.,?!"'״׳:;\-—]+/);
    for (const ch of characters) {
      const count = items.filter((i) => tokenize(i.text).includes(ch)).length;
      expect(count).toBeLessThanOrEqual(4);
    }
  });
});

describe("hebrew_comprehension — items.ts integration", () => {
  it("itemSkill returns 'hebrew_comprehension'", () => {
    const item = items[0]!;
    expect(itemSkill(item)).toBe("hebrew_comprehension");
  });

  it("isItemCorrect accepts the correct option for Q1", () => {
    const item = items[0]!;
    const q1 = item.questions[0]!;
    expect(isItemCorrect(item, q1.options[q1.correctIndex]!, 0)).toBe(true);
  });

  it("isItemCorrect rejects a wrong option for Q1", () => {
    const item = items[0]!;
    const q1 = item.questions[0]!;
    const wrongIdx = ((q1.correctIndex + 1) % 4) as 0 | 1 | 2 | 3;
    expect(isItemCorrect(item, q1.options[wrongIdx]!, 0)).toBe(false);
  });

  it("isItemCorrect uses the right question when questionIndex=1", () => {
    const item = items[0]!;
    const q2 = item.questions[1]!;
    expect(isItemCorrect(item, q2.options[q2.correctIndex]!, 1)).toBe(true);
  });

  it("canonicalAnswer returns the correct option for the requested question", () => {
    const item = items[0]!;
    const q1 = item.questions[0]!;
    const q2 = item.questions[1]!;
    expect(canonicalAnswer(item, 0)).toBe(q1.options[q1.correctIndex]);
    expect(canonicalAnswer(item, 1)).toBe(q2.options[q2.correctIndex]);
  });

  it("isItemCorrect rejects empty / non-matching strings", () => {
    const item = items[0]!;
    expect(isItemCorrect(item, "", 0)).toBe(false);
    expect(isItemCorrect(item, "תשובה שלא קיימת", 0)).toBe(false);
  });
});
