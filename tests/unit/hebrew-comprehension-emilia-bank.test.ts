import { describe, expect, it } from "vitest";
import bank from "@/content/hebrew/comprehension-emilia.json";
import evelynBank from "@/content/hebrew/comprehension-evelyn.json";
import type { HebrewCompItem } from "@/lib/types";

const items = bank as unknown as readonly HebrewCompItem[];
const eve = evelynBank as unknown as readonly HebrewCompItem[];

describe("hebrew comprehension (Emilia) — bank integrity (first batch)", () => {
  it("has ≥ 10 items in the first batch (full target is 60)", () => {
    expect(items.length).toBeGreaterThanOrEqual(10);
  });

  it("all items carry skill=hebrew_comprehension", () => {
    for (const it of items) {
      expect(it.skill).toBe("hebrew_comprehension");
    }
  });

  it("all IDs are unique and use the hce- prefix", () => {
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.startsWith("hce-")).toBe(true);
  });

  it("first batch covers all 5 difficulty tiers with ≥ 2 items each", () => {
    const byTier: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const it of items)
      byTier[it.difficulty] = (byTier[it.difficulty] ?? 0) + 1;
    for (let d = 1; d <= 5; d++) {
      expect(byTier[d]).toBeGreaterThanOrEqual(2);
    }
  });

  it("first batch mixes articles and stories (≥ 4 of each)", () => {
    const articles = items.filter((i) => i.source_type === "article").length;
    const stories = items.filter((i) => i.source_type === "story").length;
    expect(articles).toBeGreaterThanOrEqual(4);
    expect(stories).toBeGreaterThanOrEqual(4);
  });

  it("each item has exactly 2 questions with 4 options and a valid correctIndex", () => {
    for (const it of items) {
      expect(it.questions.length).toBe(2);
      for (const q of it.questions) {
        expect(q.options.length).toBe(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThanOrEqual(3);
        expect(q.options[q.correctIndex]).toBeTruthy();
        // Options should be distinct
        expect(new Set(q.options).size).toBe(4);
      }
    }
  });

  it("text length grows with difficulty (~80 → ~200 words)", () => {
    function wordCount(s: string): number {
      return s.split(/\s+/).filter((w) => w.length > 0).length;
    }
    for (const it of items) {
      const wc = wordCount(it.text);
      if (it.difficulty <= 2) expect(wc).toBeGreaterThanOrEqual(60);
      if (it.difficulty >= 4) expect(wc).toBeGreaterThanOrEqual(100);
    }
  });

  it("topic tag exists on every item", () => {
    for (const it of items) {
      expect(it.topic).toBeTruthy();
      expect((it.topic ?? "").length).toBeGreaterThan(0);
    }
  });

  it("no growth-mindset-forbidden phrase appears in any explanation", () => {
    const forbidden = ["טעית", "לא נכון", "שגוי", "פספסת", "כישלון", "כשלון"];
    for (const it of items) {
      for (const q of it.questions) {
        for (const bad of forbidden) {
          expect(q.explanation).not.toContain(bad);
        }
      }
    }
  });
});

describe("hebrew comprehension — Emilia and Evelyn banks are disjoint", () => {
  it("no item id appears in both banks", () => {
    const evelynIds = new Set(eve.map((i) => i.id));
    const overlap = items.map((i) => i.id).filter((id) => evelynIds.has(id));
    expect(overlap).toEqual([]);
  });

  it("Emilia bank items are noticeably longer than Evelyn's on average", () => {
    function avgWords(b: readonly HebrewCompItem[]): number {
      const total = b.reduce(
        (s, it) => s + it.text.split(/\s+/).filter((w) => w.length > 0).length,
        0,
      );
      return total / b.length;
    }
    const avgEvelyn = avgWords(eve);
    const avgEmilia = avgWords(items);
    expect(avgEmilia).toBeGreaterThan(avgEvelyn);
  });
});
