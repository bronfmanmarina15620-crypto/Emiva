import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createProfile,
  loadProfiles,
  saveProfiles,
  setDifficultyOffset,
  updateProfile,
  type Profile,
} from "@/lib/profiles";
import { targetDifficulty } from "@/lib/adaptive";
import { emptyMastery } from "@/lib/mastery";
import type { MasteryState } from "@/lib/types";

/**
 * BL-021 — כיוון-הקושי מפורש פר-פרופיל, לא נגזר מגיל.
 *
 * הבאג: `seedDifficultyOffset` הוריד דרגת-קושי אחת לכל פרופיל בגיל
 * 7–8. הכיול נכתב עבור ילדה אחת (אוולין — הצליחה רק אחרי הסבר, ולכן
 * הציון שלה היה מנופח), והותנה על **גיל** כדי לא לפספס אותה אחרי
 * שהתניה לפי שם נכשלה. ברגע שהאתר נפתח לציבור (2026-08-12), כל ילד
 * חיצוני בן 7–8 התחיל דרגה מתחת לציון שלו.
 *
 * הלקח השני, והעדין יותר: תנאי-הזריעה כלל גם `=== 0`, כלומר בחירה
 * מפורשת של "רגיל" נדרסה בחזרה ל-1 בטעינה הבאה. בדיקה 4 היא זו
 * שהייתה תופסת אותו.
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

beforeEach(() => {
  const mem = new MemoryStorage();
  (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window =
    { localStorage: mem };
});

// Vitest ממחזר workers בין קבצים, ו-`profiles.ts` מזהה סביבת-שרת לפי
// `typeof window === "undefined"`. משחזרים את מה שהיה כאן לפנינו
// במקום למחוק: `profiles.test.ts` מתקין window משלו ואינו משחזר,
// ומחיקה עיוורת הייתה מפילה אותו אם סדר-ההרצה משתנה (shard/שם חדש).
// נמצא בסקירת-קוד — עבר בירוק רק בזכות מזל בתזמון.
const priorWindow = (globalThis as unknown as { window?: unknown }).window;

afterEach(() => {
  if (priorWindow === undefined) {
    delete (globalThis as unknown as { window?: unknown }).window;
  } else {
    (globalThis as unknown as { window?: unknown }).window = priorWindow;
  }
});

// מצב-שליטה שיושב על דרגה נתונה, כדי לבדוק את ההשפעה ההתנהגותית של
// הכיוון ולא רק את הערך המספרי בפרופיל.
function stateAtLevel(level: number): MasteryState {
  return { ...emptyMastery("add_sub_100"), level: level as MasteryState["level"] };
}

// הפרופיל היחיד שנשמר בכל בדיקה. strict mode מתלונן על אינדוקס ישיר,
// והבדיקות אמורות ליפול בקול אם הוא נעלם — לא להיכשל על undefined.
function onlyProfile(): Profile {
  const p = loadProfiles()[0];
  if (!p) throw new Error("לא נמצא פרופיל");
  return p;
}

describe("כיוון-קושי — מפורש פר-פרופיל, לא נגזר מגיל (BL-021)", () => {
  it("פרופיל חדש בגיל 7 נפתח ב-0 — בלי הורדת דרגה", () => {
    createProfile("ילד חדש", 7);
    const loaded = onlyProfile();

    expect(loaded.difficultyOffset).toBe(0);
    // ההשלכה האמיתית: הוא מקבל את הדרגה שהציון שלו מכתיב, לא אחת מתחת.
    expect(targetDifficulty(stateAtLevel(3), loaded.difficultyOffset ?? 0)).toBe(
      3,
    );
  });

  it("גם בגיל 8, וגם אחרי טעינה חוזרת — הערך נשאר 0", () => {
    createProfile("ילדה בת 8", 8);
    loadProfiles();
    loadProfiles();

    expect(onlyProfile().difficultyOffset).toBe(0);
  });

  it("ערך מפורש שאינו-אפס לעולם לא נדרס בטעינה", () => {
    const p: Profile = {
      id: "p-manual",
      name: "עם כיוון ידני",
      age: 7,
      allowedSkills: [],
      createdAt: 1,
      difficultyOffset: 2,
    };
    saveProfiles([p]);

    loadProfiles();
    expect(onlyProfile().difficultyOffset).toBe(2);
  });

  it("setDifficultyOffset(0) באמת מאפס — ולא חוזר ל-1 בטעינה הבאה", () => {
    const created = createProfile("אווה", 7);
    setDifficultyOffset(created.id, 1);
    expect(onlyProfile().difficultyOffset).toBe(1);

    // ההורה בוחרת "רגיל". זו הבחירה שהזריעה הישנה הייתה מבטלת.
    setDifficultyOffset(created.id, 0);
    loadProfiles();

    expect(onlyProfile().difficultyOffset).toBe(0);
    expect(
      targetDifficulty(stateAtLevel(3), onlyProfile().difficultyOffset ?? 0),
    ).toBe(3);
  });

  it("עריכה של שם או גיל לא מוחקת את הכיוון", () => {
    const created = createProfile("ילד", 7);
    setDifficultyOffset(created.id, 1);

    updateProfile(created.id, { name: "שם חדש", age: 8 });

    expect(onlyProfile().difficultyOffset).toBe(1);
    expect(onlyProfile().name).toBe("שם חדש");
  });

  it("גיל 9 לא מושפע", () => {
    createProfile("אמיליה", 9);
    expect(onlyProfile().difficultyOffset).toBe(0);
  });
});
