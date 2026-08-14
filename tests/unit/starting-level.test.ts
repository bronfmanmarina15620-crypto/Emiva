import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createProfile,
  loadProfiles,
  saveProfiles,
  updateProfile,
  type Profile,
} from "@/lib/profiles";
import {
  advanceLevel,
  hasRealData,
  nextLevel,
  targetDifficulty,
} from "@/lib/adaptive";
import { emptyMastery, recordAttempt } from "@/lib/mastery";
import type { Difficulty, MasteryState } from "@/lib/types";

/**
 * BL-017 — נקודת-הפתיחה: שאלה אחת להורה בהרשמה.
 *
 * הבעיה: כל ילד/ה התחיל/ה כל מיומנות בדרגה 1 מתוך 5, ו-5 השאלות
 * הראשונות נעולות שם (`LEVEL_CHANGE_MIN_ATTEMPTS`). בסשן של 13
 * שאלות זה כשליש מהסבב מתחת לרמה של ילד/ה חזק/ה.
 *
 * החוק המרכזי שנבדק כאן: נקודת-הפתיחה חלה **רק עד שיש נתונים
 * אמיתיים**, ואז מפסיקה להשפיע לתמיד. זו ההגנה מפני כשל-BL-021,
 * שבו ערך-פרופיל דרס מדידה קיימת.
 */

class MemoryStorage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  getItem(k: string) {
    return this.store.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.store.set(k, v);
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
  key(i: number): string | null {
    return [...this.store.keys()][i] ?? null;
  }
  clear() {
    this.store.clear();
  }
}

// משחזרים במקום למחוק — `profiles.test.ts` מתקין window משלו ואינו
// משחזר, ומחיקה עיוורת הייתה מפילה אותו אם סדר-ההרצה משתנה.
const priorWindow = (globalThis as unknown as { window?: unknown }).window;

beforeEach(() => {
  const mem = new MemoryStorage();
  (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window =
    { localStorage: mem };
});

afterEach(() => {
  if (priorWindow === undefined) {
    delete (globalThis as unknown as { window?: unknown }).window;
  } else {
    (globalThis as unknown as { window?: unknown }).window = priorWindow;
  }
});

/** מצב טרי לגמרי — מיומנות שמעולם לא תורגלה. */
function freshState(): MasteryState {
  return emptyMastery("add_sub_100");
}

/**
 * מצב עם n ניסיונות, ודרגה שמורה אופציונלית.
 *
 * דרגה מפורשת פירושה "נמדדה" — כי בקוד האמיתי הדרך היחידה שדרגה
 * נשמרת היא דרך `advanceLevel`, שמרים גם את הדגל. בדיקה שתקבע
 * דרגה בלי הדגל הייתה בודקת מצב שאינו קיים במציאות.
 */
function stateWith(n: number, correct: boolean, level?: Difficulty): MasteryState {
  let s = emptyMastery("add_sub_100");
  for (let i = 0; i < n; i++) s = recordAttempt(s, `i${i}`, correct, i);
  return level === undefined ? s : { ...s, level, levelMeasured: true };
}

function onlyProfile(): Profile {
  const p = loadProfiles()[0];
  if (!p) throw new Error("לא נמצא פרופיל");
  return p;
}

describe("נקודת-הפתיחה — חלה רק עד שיש נתונים (BL-017)", () => {
  it("פרופיל שדילג על השאלה מתחיל בדרגה 1 — בדיוק כמו היום", () => {
    createProfile("ילד", 9);
    const p = onlyProfile();

    expect(p.startingLevel).toBeUndefined();
    expect(targetDifficulty(freshState(), 0, p.startingLevel ?? 1)).toBe(1);
  });

  it("'כבר מכיר את החומר' מגיש דרגה 3 בשאלה הראשונה", () => {
    createProfile("ילדה", 9, undefined, undefined, 3);
    const p = onlyProfile();

    expect(p.startingLevel).toBe(3);
    // ההשלכה האמיתית — לא רק שהשדה נשמר.
    expect(targetDifficulty(freshState(), 0, p.startingLevel ?? 1)).toBe(3);
  });

  it("'מחפשים אתגר' מגיש דרגה 5", () => {
    createProfile("ילד", 9, undefined, undefined, 5);
    expect(targetDifficulty(freshState(), 0, onlyProfile().startingLevel ?? 1)).toBe(
      5,
    );
  });

  it("אחרי חמישה ניסיונות הדרגה נקבעת מהנתונים, לא מההורה", () => {
    // דרגה 2 נמדדה בפועל; ההורה אמר 5. הנתונים מנצחים.
    const s = stateWith(5, true, 2);
    expect(hasRealData(s)).toBe(true);
    expect(targetDifficulty(s, 0, 5)).toBe(2);
  });

  it("ילד/ה עם היסטוריה ארוכה לא מוחזר/ת לנקודת-הפתיחה", () => {
    // הכיוון ההפוך: נקודת-פתיחה נמוכה לא גוררת למטה מי שטיפס/ה.
    const s = stateWith(40, true, 4);
    expect(targetDifficulty(s, 0, 1)).toBe(4);
  });

  it("טעות אחת בהתחלה לא מפילה מדרגה 4 לדרגה 1", () => {
    // הבדיקה שנופלת אם מישהו יפשט את hasRealData ל-`> 0`:
    // אז hasRealData היה נדלק, state.level עדיין 1 (nextLevel לא זז),
    // והילד/ה היה/הייתה צונח/ת מ-4 ל-1 אחרי תשובה שגויה אחת.
    const s = stateWith(1, false);
    expect(hasRealData(s)).toBe(false);
    expect(targetDifficulty(s, 0, 4)).toBe(4);
  });

  it("דרגה שמורה שאינה 1 מנצחת גם עם מדגם זעיר", () => {
    // ילד/ה בדרגה 3 עם ניסיון אחד — מישהו כבר הזיז את הדרגה,
    // כלומר היא נמדדה. אסור לדרוס אותה בנקודת-הפתיחה.
    const s = stateWith(1, true, 3);
    expect(hasRealData(s)).toBe(true);
    expect(targetDifficulty(s, 0, 5)).toBe(3);
  });

  // נמצא בסקירת-קוד. הבאג הכי חמור בכל המשימה, והוא פגע **רק**
  // בילדים שההורה שלהם ענה/תה — כלומר בדיוק במי שהפיצ'ר בא לשרת.
  it("ילד/ה שירד/ה עד דרגה 1 לא מוקפץ/ת בחזרה לנקודת-הפתיחה", () => {
    // ההורה אמר/ה "מחפשים אתגר" (5). הילד/ה מתקשה ויורד/ת
    // 5→4→3→2→1 כמו שצריך. ברגע ההגעה ל-1 — התנאי הישן
    // (`level !== 1`) הכריז "אין נתונים" והחזיר אותו/ה ל-5.
    const s = { ...stateWith(10, false, 1), levelMeasured: true };

    expect(hasRealData(s)).toBe(true);
    expect(targetDifficulty(s, 0, 5)).toBe(1);
    expect(nextLevel(s, 5)).toBe(1);
  });

  it("הדגל נדלק אחרי מדידה אמיתית, ולא לפניה", () => {
    // שתי תשובות — עוד לא נמדד, נקודת-הפתיחה עדיין שולטת.
    const early = advanceLevel(stateWith(2, true), 4);
    expect(early.levelMeasured).toBe(false);
    expect(targetDifficulty(early, 0, 4)).toBe(4);

    // חמש תשובות — נמדד, ומכאן הנתונים שולטים.
    const measured = advanceLevel(stateWith(5, true), 4);
    expect(measured.levelMeasured).toBe(true);
  });

  // נמצא בסקירת-קוד: דרגה שנגזרה מהיסטוריה (`seedLevelFromHistory`)
  // יכולה לנבוע משני ניסיונות בלבד. לברך אותה כ"נמדדה" היה מחזיר
  // בדיוק את היסק-הערך שהדגל בא להחליף.
  it("דרגה שנגזרה משני ניסיונות אינה נחשבת מדידה", () => {
    // מצב ותיק בלי דרגה שמורה כלל — הדגל לא אמור לעלות מהמיגרציה.
    const legacy = { ...stateWith(2, true), level: undefined };
    expect(legacy.levelMeasured).toBeUndefined();
    expect(hasRealData(legacy)).toBe(false);
    expect(targetDifficulty(legacy, 0, 4)).toBe(4);
  });

  it("הדגל לא נכבה אחרי שנדלק", () => {
    const s = { ...stateWith(1, true, 3), levelMeasured: true };
    expect(advanceLevel(s, 5).levelMeasured).toBe(true);
  });

  it("nextLevel מטפס מנקודת-הפתיחה, לא מדרגה 1", () => {
    // בלי זה: ילד/ה שהתחיל/ה ב-4 היה/הייתה מטפס/ת מ-1 בניסיון
    // החמישי — כלומר צונח/ת לדרגה 2 בדיוק כשההעברה קורית.
    const s = stateWith(5, true);
    expect(nextLevel(s, 4)).toBe(5);
  });

  it("נקודת-הפתיחה וקצב-ההתחלה מצטרפים: 4 מינוס 1 = 3", () => {
    expect(targetDifficulty(freshState(), 1, 4)).toBe(3);
  });

  it("עריכת שם או גיל לא מוחקת את נקודת-הפתיחה", () => {
    const created = createProfile("ילד", 9, undefined, undefined, 3);
    updateProfile(created.id, { name: "שם חדש", age: 10 });

    expect(onlyProfile().startingLevel).toBe(3);
    expect(onlyProfile().name).toBe("שם חדש");
  });

  it("טעינה חוזרת לא זורעת ולא דורסת", () => {
    // שומר-הרגרסיה של BL-021: אף שדה-פרופיל אינו נזרע בטעינה.
    createProfile("שדילג", 9);
    loadProfiles();
    loadProfiles();
    expect(onlyProfile().startingLevel).toBeUndefined();

    const p: Profile = {
      id: "p-explicit",
      name: "בחר/ה",
      age: 9,
      allowedSkills: [],
      createdAt: 1,
      startingLevel: 5,
    };
    saveProfiles([p]);
    loadProfiles();
    expect(onlyProfile().startingLevel).toBe(5);
  });
});
