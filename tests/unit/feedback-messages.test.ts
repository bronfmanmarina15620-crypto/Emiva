import { describe, expect, it } from "vitest";
import {
  correctMessage,
  retryMessage,
  revealIntro,
  __POOLS_FOR_TESTS,
} from "@/lib/feedback-messages";

const DETERMINISTIC = () => 0;

describe("feedback-messages", () => {
  it("retry message is never judgmental", () => {
    for (let left = 2; left >= 1; left--) {
      for (let i = 0; i < 10; i++) {
        const m = retryMessage(left, () => i / 10);
        expect(m).not.toContain("לא נכון");
        expect(m).not.toContain("טעית");
        expect(m).not.toContain("שגוי");
        expect(m.length).toBeGreaterThan(0);
      }
    }
  });

  it("retry last attempt uses gentler pool", () => {
    const last = retryMessage(1, DETERMINISTIC);
    const first = retryMessage(2, DETERMINISTIC);
    expect(last).not.toBe(first);
  });

  it("correct message differs between first-try and after-retry", () => {
    const first = correctMessage(true, DETERMINISTIC);
    const after = correctMessage(false, DETERMINISTIC);
    expect(first).not.toBe(after);
  });

  it("correct-after-retry is effort-focused, not judgmental", () => {
    for (let i = 0; i < 10; i++) {
      const m = correctMessage(false, () => i / 10);
      expect(m).not.toContain("התלבטות");
      expect(m).not.toContain("סוף סוף");
    }
  });

  it("reveal intro never labels the child as wrong", () => {
    // שני המאגרים, לא רק ברירת-המחדל — הווריאציה של המילים נוספה
    // ב-CORE-ENGLISH-VOCAB-EXPLAIN-001 ואסור שתחמוק מהבדיקה.
    for (const kind of ["problem", "word"] as const) {
      for (let i = 0; i < 10; i++) {
        const m = revealIntro(() => i / 10, kind);
        expect(m).not.toContain("טעית");
        expect(m).not.toContain("לא נכון");
        expect(m).not.toContain("כישלון");
      }
    }
  });

  // במילה באנגלית אין מה "לפתור". המאגר המתמטי היה מייצר
  // "בואי נפתור יחד: cat" — ניסוח שלא מתאים למה שקורה על המסך.
  it("word reveals do not talk about solving", () => {
    const variants = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const m = revealIntro(() => i / 10, "word");
      expect(m).not.toContain("נפתור");
      expect(m).not.toContain("לפתור");
      variants.add(m);
    }
    expect(variants.size).toBeGreaterThanOrEqual(2);
  });

  it("all pools have multiple variations (avoid staleness)", () => {
    const variants = new Set<string>();
    for (let i = 0; i < 10; i++) variants.add(retryMessage(2, () => i / 10));
    expect(variants.size).toBeGreaterThanOrEqual(2);
  });
});

/**
 * GENDER-INCLUSIVE-001 G2 — the pedagogy rule (≥2 variations per message
 * category) has to hold **in every address form**, not just on average.
 *
 * This is the trap the plan predicted: splitting pools by gender quietly
 * left the neutral pools with a single line each, so a child who chose
 * "prefer not to say" would have heard the same sentence every time. The
 * fix was to write more neutral copy — not to relax the threshold.
 */
describe("feedback-messages — address forms", () => {
  const FORMS = ["neutral", "feminine", "masculine"] as const;

  it("every pool offers ≥2 variations in every address form", () => {
    const { poolFor, ...pools } = __POOLS_FOR_TESTS;
    for (const [name, pool] of Object.entries(pools)) {
      for (const form of FORMS) {
        const available = poolFor(pool as never, form);
        expect(
          available.length,
          `${name} / ${form} has ${available.length} variation(s)`,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("addresses a boy in masculine and a girl in feminine", () => {
    // Sample the whole pool: neutral lines are shared, so any single draw
    // may legitimately be one of those.
    const draws = (form: (typeof FORMS)[number]) =>
      Array.from({ length: 12 }, (_, i) => retryMessage(1, () => i / 12, form));

    const fem = draws("feminine").join(" | ");
    expect(fem).toMatch(/את יכולה|קחי/);
    expect(fem).not.toMatch(/אתה יכול|קח נשימה/);

    const masc = draws("masculine").join(" | ");
    expect(masc).toMatch(/אתה יכול|קח נשימה/);
    expect(masc).not.toMatch(/את יכולה|קחי/);
  });

  it("never uses slash forms — they hurt beginning readers", () => {
    // The Israeli government standard forbids them outright, and Emiva is
    // partly a reading app for 7-year-olds.
    const { poolFor, ...pools } = __POOLS_FOR_TESTS;
    for (const pool of Object.values(pools)) {
      for (const form of FORMS) {
        for (const s of poolFor(pool as never, form)) {
          expect(s).not.toMatch(/[א-ת]\/[א-ת]/);
        }
      }
    }
  });

  it("the neutral form never leaks gendered address", () => {
    const { poolFor, ...pools } = __POOLS_FOR_TESTS;
    for (const pool of Object.values(pools)) {
      for (const s of poolFor(pool as never, "neutral")) {
        expect(s).not.toMatch(/בואי|קחי|את יכולה|בוא |קח |אתה יכול/);
      }
    }
  });
});
