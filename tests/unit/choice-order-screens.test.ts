import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { shuffleOptions } from "@/lib/items";
import { holdoutForSkill, computeVerdict } from "@/lib/measurement";
import type { FractionItem } from "@/lib/types";

/**
 * T4 (plans/ALIGN-MYLEVEL-001.md): "ערבוב סדר התשובות במבחן... בדיקה
 * שנכשלת אם תשובות מתרכזות במקום קבוע, בכל מסך שיש בו בחירה."
 *
 * ההטיה תוקנה ב-2026-08-06 — אבל רק בדף התרגול. `shuffleOptions` הוגדרה
 * בתוך session/page.tsx, והמבחן החיצוני (parent/measurement) המשיך
 * לרנדר את הסדר מהקובץ. הבדיקות כאן מכסות את מה ש-option-order.test.ts
 * לא כיסה: את **המסכים**, לא רק את המאגרים.
 */

const CHOICE_SCREENS = [
  "src/app/session/page.tsx",
  "src/app/parent/measurement/page.tsx",
];

describe("T4 — כל מסך-בחירה מערבב את האפשרויות", () => {
  it.each(CHOICE_SCREENS)(
    "%s — מרנדר אפשרויות דרך shuffleOptions",
    (file) => {
      const src = readFileSync(file, "utf8");
      const rendersOptions = /\.options\b/.test(src);
      if (!rendersOptions) return; // מסך בלי בחירה — לא רלוונטי

      expect(
        /shuffleOptions\s*\(/.test(src),
        `${file} מרנדר answer.options בלי לקרוא ל-shuffleOptions — ` +
          `הילדה תראה תמיד את אותו סדר, וזו בדיוק ההטיה של T4`,
      ).toBe(true);
    },
  );

  it("shuffleOptions מיובאת ממקור משותף, לא מוגדרת מקומית בכל דף", () => {
    for (const file of CHOICE_SCREENS) {
      const src = readFileSync(file, "utf8");
      if (!/shuffleOptions/.test(src)) continue;
      expect(
        /function shuffleOptions/.test(src),
        `${file} מגדיר shuffleOptions מקומית. הגדרה כפולה היא הסיבה ` +
          `שהתיקון של 2026-08-06 לא הגיע למבחן — מקור אחד בלבד.`,
      ).toBe(false);
    }
  });
});

describe("T4 — הערבוב הוגן ושומר על התשובה", () => {
  it("התשובה הנכונה נשארת ברשימה אחרי ערבוב", () => {
    const bank = holdoutForSkill("fractions_intro");
    for (const item of bank) {
      const frac = item as FractionItem;
      if (frac.answer.kind !== "choice") continue;
      const shown = shuffleOptions(frac.answer.options, `seed:${frac.id}`);
      expect(shown).toContain(frac.answer.correct);
      expect(shown.length).toBe(frac.answer.options.length);
    }
  });

  it("אותו seed נותן אותו סדר (כפתורים לא קופצים בין ניסיונות)", () => {
    const opts = ["1/2", "1/3", "1/4", "2/3"];
    expect(shuffleOptions(opts, "abc")).toEqual(shuffleOptions(opts, "abc"));
  });

  it("seed שונה נותן סדר שונה (הסדר משתנה בין סשנים)", () => {
    const opts = ["1/2", "1/3", "1/4", "2/3"];
    const orders = new Set(
      Array.from({ length: 20 }, (_, i) =>
        shuffleOptions(opts, `s${i}`).join(","),
      ),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it("פורס את התשובה הנכונה על פני המקומות במאגר שלם", () => {
    // רק פריטי 4-אפשרויות: בפריט של 2 אפשרויות "ראשון" הוא הטלת מטבע,
    // ו-50% שם הוא התפלגות הוגנת ולא הטיה. ערבוב הוגן על 4 אפשרויות
    // אמור להתכנס סביב 25% לכל מקום.
    const bank = holdoutForSkill("fractions_intro");
    const counts: Record<number, number> = {};
    let total = 0;
    for (const item of bank) {
      const frac = item as FractionItem;
      if (frac.answer.kind !== "choice") continue;
      if (frac.answer.options.length < 4) continue;
      const shown = shuffleOptions(frac.answer.options, `mix:${frac.id}`);
      const idx = shown.indexOf(frac.answer.correct);
      counts[idx] = (counts[idx] ?? 0) + 1;
      total++;
    }
    const top = Math.max(...Object.values(counts));
    expect(
      top / total,
      `אחרי ערבוב, ${top} מתוך ${total} מהתשובות עדיין באותו מקום`,
    ).toBeLessThan(0.6);
  });
});

describe("T4 — ילדה שלוחצת תמיד ראשון מקבלת 'לא יודעת'", () => {
  /**
   * הדרישה המפורשת ב-T4: "היום ילדה שלוחצת תמיד ראשון מקבלת 'יש פער'
   * במקום 'לא יודעת'." לפני הערבוב: 61% → gap. אחרי: ~25% → false_mastery.
   */
  it("לחיצה קבועה על המקום הראשון אינה מייצרת verdict מטעה", () => {
    const bank = holdoutForSkill("fractions_intro");
    const choiceItems = bank.filter(
      (i) => (i as FractionItem).answer.kind === "choice",
    ) as FractionItem[];

    // ממוצע על הרבה סיבובים: כל סיבוב מקבל seed אחר, בדיוק כמו
    // שהמבחן האמיתי מקבל optionSalt חדש בכל הפעלה.
    const verdicts: string[] = [];
    for (let run = 0; run < 40; run++) {
      let score = 0;
      for (const frac of choiceItems) {
        if (frac.answer.kind !== "choice") continue;
        const shown = shuffleOptions(frac.answer.options, `run${run}:${frac.id}`);
        if (shown[0] === frac.answer.correct) score++;
      }
      verdicts.push(computeVerdict(score, choiceItems.length));
    }

    // לפני התיקון: 11 מ-18 = 61% = "gap" בעקביות, כלומר "כמעט יודעת".
    // אחרי: ניחוש קבוע נופל ל-false_mastery — "לא יודעת" — ברוב המכריע.
    const misleading = verdicts.filter((v) => v !== "false_mastery").length;
    expect(
      misleading / verdicts.length,
      `ב-${misleading} מתוך ${verdicts.length} סיבובים ניחוש קבוע קיבל ` +
        `verdict מטעה במקום "לא יודעת"`,
    ).toBeLessThan(0.15);
  });
});
