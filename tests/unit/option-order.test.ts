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

      // רף מכוון-רופף: תופס "כמעט תמיד באותו מקום" (ההטיה של 2026-08-06
      // עמדה על 99%-100%), בלי להיכשל על תנודות טבעיות במאגר קטן.
      expect(
        top / total,
        `ב-${file}, ${top} מתוך ${total} מהתשובות הנכונות באותו מיקום`,
      ).toBeLessThan(0.9);
    },
  );

  it("אף תשובה נכונה לא חסרה מרשימת המסיחים", () => {
    for (const [file, counts] of banks) {
      expect(counts[-1] ?? 0, `ב-${file} יש תשובה נכונה שלא מופיעה באפשרויות`).toBe(0);
    }
  });
});
