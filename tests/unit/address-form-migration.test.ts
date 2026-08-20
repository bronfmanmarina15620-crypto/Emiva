/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadProfiles,
  runAddressFormMigration,
  type Profile,
} from "@/lib/profiles";
import { createBackup, restoreBackup } from "@/lib/backup";

/**
 * GENDER-INCLUSIVE-001 §M — ראי `runAddressFormMigration` ב-`profiles.ts`.
 *
 * המיגרציה ממלאת `feminine` **רק** כשהשדה חסר, כדי שאוולין ואמיליה
 * לא יאבדו את החום שיש להן היום. שתי סכנות נבדקות כאן:
 * (א) דריסת בחירה מפורשת — ילד שבחר `masculine`, או מי שבחרה "לא
 *     רוצה לומר", היו מקבלים נוסח שלא ביקשו;
 * (ב) הוספת דגל "כבר רצתי" — `restoreBackup` מחזיר גם את הדגל מהגיבוי,
 *     ולכן פרופיל משוחזר-מלפני-המיגרציה היה נשאר ניטרלי לנצח.
 */

const PROFILES_KEY = "emiva.profiles.v1";

function seedRaw(profiles: unknown[]): void {
  window.localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

function rawProfiles(): Profile[] {
  return JSON.parse(
    window.localStorage.getItem(PROFILES_KEY) ?? "[]",
  ) as Profile[];
}

/** פרופיל כפי שהוא נשמר בפועל — בלי `addressForm`, כמו של הבנות. */
function legacyProfile(id: string, name: string, age: number) {
  return {
    id,
    name,
    age,
    allowedSkills: [],
    createdAt: 1_700_000_000_000,
  };
}

/**
 * פרופיל שנוצר **אחרי** שמסך הבחירה עלה, וההורה בחרה לדלג על השאלה.
 * נראה זהה לוותיק (`addressForm` חסר) — וזה בדיוק הבלבול שהמיגרציה
 * דרסה בו בחירה מפורשת (סקירת-קוד 2026-08-19).
 */
function skippedProfile(id: string, name: string, age: number) {
  return {
    id,
    name,
    age,
    allowedSkills: [],
    createdAt: Date.parse("2026-08-15T09:00:00Z"),
  };
}

describe("מיגרציית לשון-הפנייה", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("פרופיל בלי לשון-פנייה מקבל feminine", () => {
    seedRaw([legacyProfile("p-eve", "אוולין", 7)]);

    runAddressFormMigration();

    expect(loadProfiles()[0]?.addressForm).toBe("feminine");
  });

  /**
   * ⚠️ שני הבאים **חייבים** לכלול גם פרופיל חסר-שדה. בלעדיו היציאה
   * המוקדמת חוסמת את המיגרציה עוד לפני שלב-הכתיבה, והבדיקה עוברת
   * גם אם תנאי "רק כשחסר" נמחק — כלומר היא לא בודקת כלום.
   * (נמצא בבדיקת-המוטציה: הגרסה הראשונה של שתי הבדיקות האלה עברה
   * ירוק מול מימוש שדרס כל בחירה.)
   */
  it("לא נוגעת בבחירה מפורשת של masculine", () => {
    seedRaw([
      legacyProfile("p-eve", "אוולין", 7),
      { ...legacyProfile("p-boy", "יונתן", 8), addressForm: "masculine" },
    ]);

    runAddressFormMigration();

    expect(loadProfiles()[1]?.addressForm).toBe("masculine");
  });

  it("לא נוגעת ב-neutral שנבחר במפורש ('לא רוצה לומר')", () => {
    seedRaw([
      legacyProfile("p-eve", "אוולין", 7),
      { ...legacyProfile("p-nb", "נועה", 9), addressForm: "neutral" },
    ]);

    runAddressFormMigration();

    expect(loadProfiles()[1]?.addressForm).toBe("neutral");
  });

  it("מתקנת פרופילים חסרים ומשאירה בחירות קיימות באותה ריצה", () => {
    seedRaw([
      legacyProfile("p-eve", "אוולין", 7),
      { ...legacyProfile("p-boy", "יונתן", 8), addressForm: "masculine" },
      { ...legacyProfile("p-nb", "נועה", 9), addressForm: "neutral" },
    ]);

    runAddressFormMigration();

    const byId = Object.fromEntries(
      loadProfiles().map((p) => [p.id, p.addressForm]),
    );
    expect(byId).toEqual({
      "p-eve": "feminine",
      "p-boy": "masculine",
      "p-nb": "neutral",
    });
  });

  /**
   * 🔴 **הבדיקה שתישבר אם מישהו יוסיף דגל "כבר רצתי".** משתמשת
   * ב-`restoreBackup` **האמיתי**, שמוחק את כל מפתחות `emiva.` וכותב
   * מחדש מהגיבוי — כולל דגלי-מיגרציה.
   *
   * **הסדר כאן קריטי, ולא שרירותי** (נמצא בבדיקת-מוטציה): גיבוי
   * שנלקח *לפני* המיגרציה אינו מכיל דגל, ולכן שחזור שלו מנקה את
   * הדגל מהאחסון וגרסה עם-דגל הייתה עוברת ירוק. התרחיש האמיתי הוא
   * ההפוך — הורה מגבה **אחרי** שהמיגרציה כבר רצה (הגיבוי נושא את
   * הדגל), ואז משחזרת גיבוי **ישן יותר** של הפרופילים. אז הדגל
   * אומר "כבר רצתי" בעוד הפרופיל חסר את השדה, והבת נשארת ניטרלית
   * לנצח. זה מה שמדומה כאן.
   */
  it("שחזור גיבוי מלפני המיגרציה → המיגרציה מתקנת שוב", () => {
    // מצב מלפני המיגרציה — נשמר בצד כדי לשחזר אליו בהמשך.
    const preMigrationProfiles = JSON.stringify([
      legacyProfile("p-eve", "אוולין", 7),
    ]);

    seedRaw([legacyProfile("p-eve", "אוולין", 7)]);
    runAddressFormMigration();
    expect(loadProfiles()[0]?.addressForm).toBe("feminine");

    // ההורה מגבה **אחרי** המיגרציה: הגיבוי נושא כל דגל שנכתב.
    const backup = createBackup(1_700_000_000_000)!;
    // ...אבל הפרופילים בקובץ הם מהמצב הישן (גיבוי ישן יותר שהיא
    // מעלה, או קובץ שנשמר לפני שהיא פתחה את האפליקציה במכשיר הזה).
    backup.data[PROFILES_KEY] = preMigrationProfiles;

    const result = restoreBackup(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    expect(loadProfiles()[0]?.addressForm).toBeUndefined();

    // הטעינה הבאה חייבת לתקן שוב. ריצה חוזרת היא תכונה, לא באג.
    runAddressFormMigration();
    expect(loadProfiles()[0]?.addressForm).toBe("feminine");
  });

  it("אחסון חסום לא מפיל את טעינת האפליקציה", () => {
    seedRaw([legacyProfile("p-eve", "אוולין", 7)]);
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });

    try {
      expect(() => runAddressFormMigration()).not.toThrow();
    } finally {
      setItem.mockRestore();
    }
  });

  it("מצב יציב: ריצה שנייה אינה כותבת בכלל", () => {
    seedRaw([legacyProfile("p-eve", "אוולין", 7)]);
    runAddressFormMigration();

    const setItem = vi.spyOn(Storage.prototype, "setItem");
    try {
      runAddressFormMigration();
      expect(setItem).not.toHaveBeenCalled();
    } finally {
      setItem.mockRestore();
    }
  });

  it("אינה נוגעת בשדות אחרים של הפרופיל", () => {
    seedRaw([
      {
        ...legacyProfile("p-eve", "אוולין", 7),
        birthDate: "2019-03-01",
        speechRate: 0.8,
        difficultyOffset: 1,
        startingLevel: 3,
      },
    ]);

    runAddressFormMigration();

    const saved = rawProfiles()[0]!;
    expect(saved.birthDate).toBe("2019-03-01");
    expect(saved.speechRate).toBe(0.8);
    expect(saved.difficultyOffset).toBe(1);
    expect(saved.startingLevel).toBe(3);
  });

  /**
   * הממצא החמור מסקירת-הקוד: "דילגתי בכוונה" ו"פרופיל ותיק" נראים
   * שניהם `undefined`. בלי גבול-הזמן ההורה שבחרה לדלג הייתה מקבלת
   * לשון נקבה בטעינה הבאה — דריסה שקטה של בחירה מפורשת.
   */
  it("אינה נוגעת בפרופיל חדש שההורה דילגה בו על השאלה", () => {
    seedRaw([skippedProfile("p-new", "ילד חדש", 8)]);

    runAddressFormMigration();

    expect(rawProfiles()[0]!.addressForm).toBeUndefined();
  });

  it("מתקנת ותיק ומכבדת דילוג — באותו מאגר", () => {
    seedRaw([
      legacyProfile("p-eve", "אוולין", 7),
      skippedProfile("p-new", "ילד חדש", 8),
    ]);

    runAddressFormMigration();

    const byId = Object.fromEntries(rawProfiles().map((p) => [p.id, p]));
    expect(byId["p-eve"]!.addressForm).toBe("feminine");
    expect(byId["p-new"]!.addressForm).toBeUndefined();
  });
});
