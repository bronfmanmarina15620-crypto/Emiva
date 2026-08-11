import { describe, expect, it } from "vitest";
import {
  correctMessage,
  retryMessage,
  revealIntro,
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
