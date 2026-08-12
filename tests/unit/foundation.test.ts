import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  entryFor,
  flagsFor,
  isFilledFor,
  loadLog,
  monthKey,
  monthLabel,
  monthsSinceLastEntry,
  saveEntry,
  type FoundationEntry,
} from "@/lib/foundation";
import type { Profile } from "@/lib/profiles";

/**
 * MyLevel.docx §2 + §11.2 — שלושת הדברים שאסור לפספס.
 *
 * §2: "אלה תנאי סף ללמידה... חשוב יותר מכל 13 הנושאים יחד."
 *
 * הבדיקות שומרות על שני דברים: שהדגלים אומרים מה שהמסמך אומר,
 * ושהמודול **אינו** הופך לכלי ניקוד של ההורה.
 */

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) {
    return this.store.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.store.set(k, v);
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
  get length() {
    return this.store.size;
  }
  key(i: number) {
    return [...this.store.keys()][i] ?? null;
  }
}

beforeEach(() => {
  (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window =
    { localStorage: new MemoryStorage() };
});

const EVELYN = { id: "p-evelyn", name: "אוולין" } as Profile;
const EMILIA = { id: "p-emilia", name: "אמיליה" } as Profile;
const GIRLS = [EVELYN, EMILIA];

function entry(over: Partial<FoundationEntry> = {}): FoundationEntry {
  return {
    month: "2026-08",
    at: 1_700_000_000_000,
    sleep: "yes",
    emptyDay: "every_week",
    books: { "p-evelyn": "one", "p-emilia": "many" },
    mood: { "p-evelyn": "happy", "p-emilia": "happy" },
    ...over,
  };
}

describe("תשתית — בידוד משכבת המדידה", () => {
  const src = readFileSync("src/lib/foundation.ts", "utf8");

  it.each(["mastery", "srs", "measurement", "adaptive"])(
    "אינו מייבא %s",
    (mod) => {
      const importsIt = new RegExp(`from\\s+["'].*/${mod}`).test(src);
      expect(
        importsIt,
        `foundation.ts מייבא ${mod} — §2 מודד את התנאים סביב הילדה, ` +
          `לא את הילדה.`,
      ).toBe(false);
    },
  );

  it("אין ציון, אחוז או דירוג", () => {
    // §2 אינו מדרג בתים. "3 מתוך 5" היה הופך את זה לתעודה להורה.
    for (const forbidden of ["score", "percent", "rating", "grade"]) {
      expect(
        new RegExp(`\\b${forbidden}\\b`, "i").test(src),
        `foundation.ts מכיל "${forbidden}" — התשתית אינה מקבלת ציון`,
      ).toBe(false);
    }
  });
});

describe("תשתית — מפתח החודש", () => {
  it("monthKey מחזיר YYYY-MM עם ריפוד אפס", () => {
    expect(monthKey(Date.UTC(2026, 0, 15))).toBe("2026-01");
    expect(monthKey(Date.UTC(2026, 11, 1))).toBe("2026-12");
  });

  it("monthLabel מתרגם לעברית", () => {
    expect(monthLabel("2026-08")).toBe("אוגוסט 2026");
    expect(monthLabel("2026-01")).toBe("ינואר 2026");
  });
});

describe("תשתית — שמירה וטעינה", () => {
  it("שמירה וטעינה הלוך-חזור", () => {
    expect(loadLog()).toEqual([]);
    saveEntry(entry());
    const log = loadLog();
    expect(log.length).toBe(1);
    expect(log[0]?.month).toBe("2026-08");
    expect(log[0]?.books["p-evelyn"]).toBe("one");
  });

  it("שמירה חוזרת לאותו חודש מחליפה — אפשר לתקן", () => {
    saveEntry(entry({ sleep: "no" }));
    saveEntry(entry({ sleep: "yes" }));
    const log = loadLog();
    expect(log.length).toBe(1);
    expect(log[0]?.sleep).toBe("yes");
  });

  it("חודשים נשמרים ממוינים", () => {
    saveEntry(entry({ month: "2026-09" }));
    saveEntry(entry({ month: "2026-07" }));
    saveEntry(entry({ month: "2026-08" }));
    expect(loadLog().map((e) => e.month)).toEqual([
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
  });

  it("entryFor ו-isFilledFor מוצאים את החודש הנכון", () => {
    saveEntry(entry({ month: "2026-08" }));
    const log = loadLog();
    expect(entryFor(log, "2026-08")).not.toBeNull();
    expect(entryFor(log, "2026-09")).toBeNull();
    expect(isFilledFor(log, "2026-08")).toBe(true);
    expect(isFilledFor(log, "2026-09")).toBe(false);
  });
});

describe("תשתית — דגלים לפי §11.2", () => {
  it("חודש תקין לא מרים אף דגל", () => {
    expect(flagsFor(entry(), GIRLS)).toEqual([]);
  });

  it("שינה מתחת ל-9 שעות — הדגל שהמסמך קורא לו 'מקור הכל'", () => {
    const flags = flagsFor(entry({ sleep: "no" }), GIRLS);
    expect(flags.length).toBe(1);
    expect(flags[0]?.row).toBe("sleep");
    expect(flags[0]?.profileId).toBeNull();
    expect(flags[0]?.text).toContain("מקור הכל");
  });

  it("שינה לא יציבה מרימה דגל רך יותר", () => {
    const flags = flagsFor(entry({ sleep: "mostly" }), GIRLS);
    expect(flags.length).toBe(1);
    expect(flags[0]?.row).toBe("sleep");
  });

  it("בלי יום ריק — דגל העמסה ברמת הבית", () => {
    const flags = flagsFor(entry({ emptyDay: "none" }), GIRLS);
    expect(flags.length).toBe(1);
    expect(flags[0]?.row).toBe("emptyDay");
    expect(flags[0]?.profileId).toBeNull();
  });

  it("'some_weeks' ביום ריק אינו מרים דגל", () => {
    expect(flagsFor(entry({ emptyDay: "some_weeks" }), GIRLS)).toEqual([]);
  });

  it("אפס ספרים — §11.2 מסמן פחות מאחד כבעיה", () => {
    const flags = flagsFor(
      entry({ books: { "p-evelyn": "none", "p-emilia": "many" } }),
      GIRLS,
    );
    expect(flags.length).toBe(1);
    expect(flags[0]?.row).toBe("books");
    expect(flags[0]?.profileId).toBe("p-evelyn");
    expect(flags[0]?.text).toContain("אוולין");
  });

  it("ספר אחד מספיק — אין דגל", () => {
    const flags = flagsFor(
      entry({ books: { "p-evelyn": "one", "p-emilia": "one" } }),
      GIRLS,
    );
    expect(flags).toEqual([]);
  });

  it("בת לא שמחה — הדגל מאשים את השיטה, לא אותה", () => {
    const flags = flagsFor(
      entry({ mood: { "p-evelyn": "happy", "p-emilia": "not_happy" } }),
      GIRLS,
    );
    expect(flags.length).toBe(1);
    expect(flags[0]?.row).toBe("mood");
    expect(flags[0]?.profileId).toBe("p-emilia");
    // §11.2: "אם לא — משהו לא עובד". הניסוח חייב להצביע על השיטה.
    expect(flags[0]?.text).toContain("לא עובד");
    expect(flags[0]?.text).not.toContain("לא מתאמצת");
  });

  it("כמה בעיות יחד — כל דגל בנפרד, בלי סיכום מספרי", () => {
    const flags = flagsFor(
      entry({
        sleep: "no",
        emptyDay: "none",
        books: { "p-evelyn": "none", "p-emilia": "none" },
        mood: { "p-evelyn": "not_happy", "p-emilia": "happy" },
      }),
      GIRLS,
    );
    // 1 שינה + 1 יום ריק + 2 ספרים + 1 אווירה
    expect(flags.length).toBe(5);
    expect(flags.filter((f) => f.row === "books").length).toBe(2);
  });

  it("דגלים מוחזרים לכל בת בנפרד — בלי השוואה ביניהן", () => {
    // guardrails §1: אסור לרנדר מטריקה של בת אחת לצד השנייה.
    // כל דגל נושא profileId משלו, כדי שה-UI יוכל להפריד.
    const flags = flagsFor(
      entry({ books: { "p-evelyn": "none", "p-emilia": "none" } }),
      GIRLS,
    );
    const ids = flags.map((f) => f.profileId);
    expect(new Set(ids).size).toBe(2);
  });

  it("בת בלי תשובה שמורה אינה מרימה דגל", () => {
    // פרופיל שנוסף אחרי המילוי — לא להאשים על נתון חסר.
    const flags = flagsFor(entry({ books: {}, mood: {} }), GIRLS);
    expect(flags).toEqual([]);
  });
});

describe("תשתית — תזכורת רכה", () => {
  it("monthsSinceLastEntry הוא null כשאין היסטוריה", () => {
    expect(monthsSinceLastEntry([])).toBeNull();
  });

  it("סופר חודשים מאז הרשומה האחרונה", () => {
    saveEntry(entry({ month: "2026-06" }));
    const log = loadLog();
    expect(monthsSinceLastEntry(log, Date.UTC(2026, 5, 20))).toBe(0);
    expect(monthsSinceLastEntry(log, Date.UTC(2026, 7, 1))).toBe(2);
    expect(monthsSinceLastEntry(log, Date.UTC(2027, 0, 1))).toBe(7);
  });
});
