import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * הגנה על ההטיה שנתפסה 2026-08-06: התשובה הנכונה הייתה כתובה ראשונה
 * ב-99/100 מפריטי האנגלית של אוולין ו-100/100 של אמיליה, והכפתורים הוצגו
 * בדיוק בסדר הקובץ. אוולין יכלה להגיע ל-100% שליטה בלי לדעת מילה — פשוט
 * ללחוץ על הכפתור הימני-העליון.
 *
 * הערבוב עצמו חי ב-session/page.tsx (shuffleOptions) והוא ההגנה האמיתית,
 * כך שגם מאגר מוטה מוצג הוגן. הבדיקה הזו שומרת על השכבה השנייה: מאגר
 * שנכתב עם תשובה במיקום קבוע הוא ריח-תוכן — הוא שובר כל ניתוח שמסתכל על
 * הנתונים הגולמיים, ומשאיר את המוצר תלוי-לגמרי בשכבת-התצוגה.
 */

type PositionCounts = Record<number, number>;

function tally(dir: string): Map<string, PositionCounts> {
  const out = new Map<string, PositionCounts>();
  if (!existsSync(dir)) return out;

  for (const fn of readdirSync(dir)) {
    if (!fn.endsWith(".json")) continue;
    const raw = JSON.parse(readFileSync(join(dir, fn), "utf8"));
    const items = Array.isArray(raw) ? raw : (raw.items ?? []);
    const counts: PositionCounts = {};
    let n = 0;

    const record = (idx: number) => {
      counts[idx] = (counts[idx] ?? 0) + 1;
      n++;
    };

    for (const item of items) {
      const a = item.answer;
      if (a?.options && a.correct !== undefined) {
        record(a.options.indexOf(a.correct));
      }
      for (const q of item.questions ?? []) {
        if (!q.options) continue;
        if (q.correctIndex !== undefined) record(q.correctIndex);
        else if (q.correct !== undefined) record(q.options.indexOf(q.correct));
      }
    }

    if (n > 0) out.set(join(dir, fn), counts);
  }
  return out;
}

const CONTENT_DIRS = [
  "src/content/english",
  "src/content/hebrew",
  "src/content/math",
  "src/content/measurement",
  "src/content/review-packs",
];

describe("סדר המסיחים במאגרי התוכן", () => {
  const banks = new Map<string, PositionCounts>();
  for (const dir of CONTENT_DIRS) {
    for (const [file, counts] of tally(dir)) banks.set(file, counts);
  }

  it("מוצא מאגרים לבדיקה", () => {
    expect(banks.size).toBeGreaterThan(0);
  });

  it.each([...banks.keys()])(
    "%s — התשובה הנכונה לא נעולה במיקום אחד",
    (file) => {
      const counts = banks.get(file)!;
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const top = Math.max(...Object.values(counts));

      // רף מהודק 2026-08-11 (T4): הרף הקודם היה 0.9 — כוון להטיה של
      // 99%-100% שנתפסה ב-2026-08-06, ולכן נשאר ירוק מול 75% בעברית
      // של אווה ו-61% בשברים. בדיקה ירוקה ששקרה גרועה מאין-בדיקה.
      // 0.5 מותיר מרווח לתנודות במאגר קטן ועדיין תופס הטיה אמיתית.
      expect(
        top / total,
        `ב-${file}, ${top} מתוך ${total} מהתשובות הנכונות באותו מיקום`,
      ).toBeLessThan(0.5);
    },
  );

  it("אף תשובה נכונה לא חסרה מרשימת המסיחים", () => {
    for (const [file, counts] of banks) {
      expect(counts[-1] ?? 0, `ב-${file} יש תשובה נכונה שלא מופיעה באפשרויות`).toBe(0);
    }
  });
});

/**
 * רף מהודק למאגרי הבנת-הנקרא (נוסף 2026-08-12, batch 5).
 *
 * הרף הכללי למעלה הוא 50% — הוא נועד לתפוס הטיה קיצונית (99%-100%),
 * ובמאגר בן 100 תשובות הוא מרווח מדי: batch של 10 פריטים שבו 7 מתוך
 * 20 התשובות באותו מיקום עובר בירוק, כי הוא נבלע בממוצע של המאגר כולו.
 * זה קרה בפועל בבנייה של batch 5 — מיקום 1 קיבל 7 מתוך 20, אוזן ידנית,
 * ושום בדיקה לא הייתה תופסת אותו.
 *
 * המאגרים האלה נכתבים ב-batches קטנים ולכן חשופים בדיוק לדפוס הזה.
 * שני תנאים, באותה רוח שנקבעה ב-T7ב על מאגר המדידה:
 *   · אף מיקום אינו נושא יותר מ-40% מהתשובות;
 *   · כל ארבעת המיקומים בשימוש — מיקום מת מצמצם את הבחירה ל-3.
 */
describe("פיזור התשובות במאגרי הבנת-הנקרא", () => {
  const COMPREHENSION_BANKS = [
    "src/content/hebrew/comprehension-emilia.json",
    "src/content/hebrew/comprehension-evelyn.json",
  ];

  it.each(COMPREHENSION_BANKS)("%s — פיזור מלא על ארבעת המיקומים", (file) => {
    const raw = JSON.parse(readFileSync(file, "utf8"));
    const items = Array.isArray(raw) ? raw : (raw.items ?? []);

    const counts: PositionCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
    let total = 0;
    for (const item of items) {
      for (const q of item.questions ?? []) {
        if (q.correctIndex === undefined) continue;
        counts[q.correctIndex] = (counts[q.correctIndex] ?? 0) + 1;
        total++;
      }
    }

    expect(total, `ב-${file} לא נמצאו שאלות`).toBeGreaterThan(0);

    const top = Math.max(...Object.values(counts));
    expect(
      top / total,
      `ב-${file}: ${top} מתוך ${total} מהתשובות באותו מיקום (${JSON.stringify(counts)})`,
    ).toBeLessThanOrEqual(0.4);

    for (let pos = 0; pos < 4; pos++) {
      expect(
        counts[pos],
        `ב-${file} מיקום ${pos} אינו בשימוש כלל — הבחירה מצטמצמת ל-3`,
      ).toBeGreaterThan(0);
    }
  });
});
