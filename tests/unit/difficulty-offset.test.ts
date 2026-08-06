import { describe, expect, it } from "vitest";
import { nextLevel, selectNextItem, targetDifficulty } from "@/lib/adaptive";
import { emptyMastery, recordAttempt } from "@/lib/mastery";
import type { Difficulty, MasteryState } from "@/lib/types";
import { MASTERY_TARGET } from "@/lib/types";

// Marina 2026-08-01 — שני לקחים מקודדים כאן:
//
// 1. מדרגות במקום מיפוי. עד לתאריך הזה הדרגה חושבה כ-`round(score*5)`,
//    ולכן 80% — "יעד ההצלחה" של MyLevel.docx — התמפה לדרגה 4/5 וילדה
//    שהייתה בדיוק ביעד נדחפה לקושי כמעט-מקסימלי.
// 2. כיוון-קושי ידני שורד את החישוב-מחדש (המקרה של אוולין: מרינה
//    עוזרת → הציון מנופח → המערכת מסיקה רמה גבוהה מדי).

function stateAt(level: Difficulty, correct: number, total: number): MasteryState {
  let s = emptyMastery("add_sub_100");
  for (let i = 0; i < correct; i++) s = recordAttempt(s, `c${i}`, true, i);
  for (let i = correct; i < total; i++) s = recordAttempt(s, `w${i}`, false, i);
  return { ...s, level };
}

describe("nextLevel — מדרגות כפי ש-parent-guide §2 מבטיח", () => {
  it("במצב היעד (80%) עולים דרגה אחת בלבד — לא קופצים ל-4", () => {
    expect(nextLevel(stateAt(1, 8, 10))).toBe(2);
    expect(nextLevel(stateAt(2, 8, 10))).toBe(3);
  });

  it("הרגרסיה שהתיקון נולד ממנה: 80% מדרגה 1 אינו 4", () => {
    // הנוסחה הישנה `round(0.8*5)` החזירה 4 בלי קשר לדרגה הנוכחית.
    expect(nextLevel(stateAt(1, 8, 10))).not.toBe(4);
  });

  it("באזור-היעד (50–80%) נשארים באותה דרגה", () => {
    for (const correct of [5, 6, 7]) {
      expect(nextLevel(stateAt(3, correct, 10))).toBe(3);
    }
  });

  it("מתחת ל-50% יורדים דרגה אחת — זה מה שחסר לאוולין", () => {
    expect(nextLevel(stateAt(4, 3, 10))).toBe(3);
    expect(nextLevel(stateAt(2, 1, 10))).toBe(1);
  });

  it("לא חורגים מהתחום 1..5", () => {
    expect(nextLevel(stateAt(5, 10, 10))).toBe(5);
    expect(nextLevel(stateAt(1, 0, 10))).toBe(1);
  });

  it("לא זזים על סמך מדגם זעיר — שאלה ראשונה שגויה לא מפילה דרגה", () => {
    const s = stateAt(3, 0, 1);
    expect(nextLevel(s)).toBe(3);
  });

  it("דרגה זזה לכל היותר ב-1 בכל שאלה, מכל מצב", () => {
    for (let level = 1 as number; level <= 5; level++) {
      for (let correct = 0; correct <= 10; correct++) {
        const next = nextLevel(stateAt(level as Difficulty, correct, 10));
        expect(Math.abs(next - level)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("ילדה שמחזיקה 80% מטפסת בהדרגה ומתייצבת בתקרה", () => {
    let s = stateAt(1, 8, 10);
    const seen: number[] = [];
    for (let i = 0; i < 8; i++) {
      s = { ...s, level: nextLevel(s) };
      seen.push(s.level as number);
    }
    expect(seen).toEqual([2, 3, 4, 5, 5, 5, 5, 5]);
  });
});

describe("targetDifficulty — כיוון-קושי ידני", () => {
  it("offset=0 מחזיר את הדרגה הנוכחית", () => {
    expect(targetDifficulty(stateAt(4, 8, 10), 0)).toBe(4);
  });

  it("offset=1 מוריד דרגה אחת", () => {
    expect(targetDifficulty(stateAt(4, 8, 10), 1)).toBe(3);
  });

  it("לעולם לא מתחת ל-1", () => {
    expect(targetDifficulty(stateAt(2, 2, 10), 5)).toBe(1);
  });

  it("ההורדה שורדת גם כשהדרגה עצמה עולה", () => {
    const before = targetDifficulty(stateAt(3, 8, 10), 1);
    const after = targetDifficulty(stateAt(4, 8, 10), 1);
    expect(before).toBe(2);
    expect(after).toBe(3);
  });

  it("נשאר בתחום 1..5 לכל דרגה ולכל offset", () => {
    for (let level = 1 as number; level <= 5; level++) {
      for (let offset = 0; offset <= 4; offset++) {
        const d = targetDifficulty(stateAt(level as Difficulty, 8, 10), offset);
        expect(d).toBeGreaterThanOrEqual(1);
        expect(d).toBeLessThanOrEqual(5);
      }
    }
  });

  it("MASTERY_TARGET הוא אכן 0.8 — יעד ההצלחה של MyLevel.docx", () => {
    expect(MASTERY_TARGET).toBe(0.8);
  });
});

describe("חזרות (SRS) לא דורסות את רמת הקושי", () => {
  // Marina 2026-08-01 — הדיווח: "אוולין כבר עשתה 3 פעמים את אותה רמה".
  // הסיבה: פריטים שהגיע זמנם לחזרה נבחרו לפני שהקושי נלקח בחשבון, וכל
  // טעות מאפסת פריט לקופסה 1. ילדה שמתקשה צברה ערימת-חזרות קשות
  // שחסמה את ירידת-הדרגה מלהגיע אליה.
  const bank = [
    { id: "easy1", skill: "add_sub_100", difficulty: 1, prompt: "1+1", answer: 2, operands: [1, 1], op: "+" },
    { id: "easy2", skill: "add_sub_100", difficulty: 2, prompt: "2+3", answer: 5, operands: [2, 3], op: "+" },
    { id: "hard1", skill: "add_sub_100", difficulty: 5, prompt: "37+28", answer: 65, operands: [37, 28], op: "+" },
    { id: "hard2", skill: "add_sub_100", difficulty: 5, prompt: "48+39", answer: 87, operands: [48, 39], op: "+" },
  ] as unknown as readonly import("@/lib/types").Item[];

  it("ילדה ברמה 1 לא מקבלת פריט קשה רק כי הוא 'לחזרה'", () => {
    // כל הפריטים הקשים במצב 'לחזרה' (קופסה 1 = מיד), הקלים לא.
    let s = emptyMastery("add_sub_100");
    s = {
      ...s,
      level: 1,
      srs: {
        hard1: { box: 1, sessionsUntilDue: 0 },
        hard2: { box: 1, sessionsUntilDue: 0 },
        easy1: { box: 3, sessionsUntilDue: 4 },
        easy2: { box: 3, sessionsUntilDue: 4 },
      },
    };
    const next = selectNextItem(s, bank, new Set(), () => 0);
    expect(next).not.toBeNull();
    // לפני התיקון היה נבחר hard1 (רמה 5) לילדה שנמצאת ברמה 1.
    expect(next!.difficulty).toBeLessThanOrEqual(2);
  });

  it("חזרה שכן מתאימה לרמה עדיין מקבלת עדיפות", () => {
    let s = emptyMastery("add_sub_100");
    s = {
      ...s,
      level: 1,
      srs: {
        easy1: { box: 1, sessionsUntilDue: 0 },
        easy2: { box: 3, sessionsUntilDue: 4 },
      },
    };
    const next = selectNextItem(s, bank, new Set(), () => 0);
    expect(next?.id).toBe("easy1");
  });
});
