// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { loadMastery, saveMastery } from "@/lib/storage";
import { advanceLevel, targetDifficulty } from "@/lib/adaptive";
import { emptyMastery, recordAttempt } from "@/lib/mastery";
import type { Difficulty, MasteryState } from "@/lib/types";

/**
 * BL-017 — **המסלול שאף בדיקה לא כיסתה: שמירה וטעינה.**
 *
 * כל 18 הבדיקות הקודמות בנו מצב בזיכרון ובדקו אותו בזיכרון. אף אחת
 * לא כתבה לאחסון וקראה בחזרה — וזה בדיוק המסלול שבו הפיצ'ר נשבר
 * לגמרי: `normalizeMastery` שיחזר את הדגל מתוך `level`, וכך החזיר
 * את אותו היסק-ערך שהדגל נועד להחליף. התוצאה: אחרי רענון אחד,
 * ילד/ה ש"מחפש/ת אתגר" קיבל/ה שאלות בדרגה 1 לתמיד.
 *
 * נמצא בסקירת-קוד רביעית, כש-966 בדיקות היו ירוקות.
 */

beforeEach(() => {
  localStorage.clear();
});

function practiced(n: number, ok: boolean): MasteryState {
  let s = emptyMastery("add_sub_100");
  for (let i = 0; i < n; i++) s = recordAttempt(s, `i${i}`, ok, i);
  return s;
}

describe("נקודת-הפתיחה שורדת שמירה וטעינה (BL-017)", () => {
  it("ילד/ה חדש/ה: הדרגה נשמרת, ואחרי טעינה עדיין מקבל/ת את נקודת-הפתיחה", () => {
    // בדיוק מה שקורה ב-beginSession: שומרים מצב טרי לפני כל תשובה.
    const fresh = emptyMastery("add_sub_100");
    saveMastery("p1", fresh);

    const reloaded = loadMastery("p1", "add_sub_100");

    expect(reloaded.levelMeasured).not.toBe(true);
    // הבאג: כאן הוחזר 1 במקום 5, ולתמיד.
    expect(targetDifficulty(reloaded, 0, 5)).toBe(5);
  });

  it("אחרי מדידה אמיתית — הדגל שורד, ונקודת-הפתיחה מפסיקה להשפיע", () => {
    const measured = advanceLevel(practiced(5, false), 5);
    saveMastery("p1", measured);

    const reloaded = loadMastery("p1", "add_sub_100");

    expect(reloaded.levelMeasured).toBe(true);
    expect(reloaded.level).toBe(4);
    expect(targetDifficulty(reloaded, 0, 5)).toBe(4);
  });

  it("ילד/ה שירד/ה עד 1 נשאר/ת שם גם אחרי טעינה", () => {
    let s = practiced(10, false);
    for (let i = 0; i < 6; i++) s = advanceLevel(s, 5);
    saveMastery("p1", s);

    const reloaded = loadMastery("p1", "add_sub_100");

    expect(reloaded.level).toBe(1);
    expect(reloaded.levelMeasured).toBe(true);
    // הלכידה הכי כואבת: כאן הוא/היא הוקפץ/ה בחזרה ל-5.
    expect(targetDifficulty(reloaded, 0, 5)).toBe(1);
  });

  it("סשן חלקי (4 תשובות) — עדיין לא נמדד, נקודת-הפתיחה מחזיקה", () => {
    let s = emptyMastery("add_sub_100");
    for (let i = 0; i < 4; i++) {
      s = recordAttempt(s, `a${i}`, false, i);
      s = advanceLevel(s, 5);
    }
    saveMastery("p1", s);

    const reloaded = loadMastery("p1", "add_sub_100");
    expect(reloaded.levelMeasured).not.toBe(true);
    expect(targetDifficulty(reloaded, 0, 5)).toBe(5);
  });

  // נמצא בסקירה חמישית: הלכידה שרדה על **נתונים ישנים**. ילד/ה
  // ותיק/ה שמתקשה יושב/ת על דרגה 1 בלי דגל, ותנאי של "דרגה שאינה 1"
  // בלבד היה מקפיץ אותו/ה לנקודת-הפתיחה של ההורה.
  it("ילד/ה ותיק/ה שמתקשה בדרגה 1, בלי דגל — לא מוקפץ/ת", () => {
    const legacy = { ...practiced(20, false), level: 1 as Difficulty };
    delete (legacy as { levelMeasured?: boolean }).levelMeasured;
    saveMastery("p1", legacy);

    const reloaded = loadMastery("p1", "add_sub_100");
    expect(targetDifficulty(reloaded, 0, 5)).toBe(1);
  });

  it("דגל שנשמר כ-false נטען כ-false ולא נופל להיסק", () => {
    const partial = advanceLevel(practiced(2, true), 5);
    expect(partial.levelMeasured).toBe(false);
    saveMastery("p1", partial);

    const reloaded = loadMastery("p1", "add_sub_100");
    expect(reloaded.levelMeasured).toBe(false);
    expect(targetDifficulty(reloaded, 0, 5)).toBe(5);
  });

  it("פרופיל ותיק עם דרגה שנמדדה נשאר מדוד גם בלי הדגל", () => {
    // נתונים שנשמרו לפני שהדגל היה קיים: דרגה 4 + היסטוריה.
    const legacy = { ...practiced(20, true), level: 4 as Difficulty };
    delete (legacy as { levelMeasured?: boolean }).levelMeasured;
    saveMastery("p1", legacy);

    const reloaded = loadMastery("p1", "add_sub_100");
    expect(targetDifficulty(reloaded, 0, 1)).toBe(4);
  });
});
