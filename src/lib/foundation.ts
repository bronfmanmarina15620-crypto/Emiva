import type { Profile } from "./profiles";
import {
  loadFoundationLog,
  saveFoundationLog,
  type BooksAnswer,
  type EmptyDayAnswer,
  type FoundationEntry,
  type MoodAnswer,
  type SleepAnswer,
} from "./storage";

export type {
  BooksAnswer,
  EmptyDayAnswer,
  FoundationEntry,
  MoodAnswer,
  SleepAnswer,
};

/**
 * שכבת התשתית — MyLevel.docx §2 + §11.2.
 *
 * §2: "אלה תנאי סף ללמידה. בלעדיהם, כל תוכנית — מבריקה ככל שתהיה —
 * נכשלת. חשוב יותר מכל 13 הנושאים יחד."
 *
 * 🔴 המודול הזה **אינו** מייבא mastery, SRS או measurement. הוא
 * אינו מודד את הילדה אלא את **התנאים** סביבה, וההורה היא שממלאת
 * אותו. אין כאן ציון, אין אחוז ואין השוואה בין הבנות
 * (`.claude/rules/parent-dashboard-guardrails.md` §1).
 *
 * הקצב **חודשי** במפורש — §11.2 כותרתו "מדידה חודשית". מעקב יומי
 * אחר שינה היה הופך את זה לנטל, וזה בדיוק מה שהשער מזהיר מפניו.
 */

/**
 * ארבע התשובות (הטיפוסים ב-`storage.ts`, למניעת תלות מעגלית):
 * - `sleep` — §2 קובע 9–11 שעות. שלושת המצבים הם מה שהורה יכולה
 *   לומר בכנות בלי לנהל יומן שינה.
 * - `books` — §11.2: *"כמה ספרים סיימו החודש? פחות מ-1 = בעיה"*.
 * - `emptyDay` — §11.2: *"האם היה יום ריק מוחלט בכל שבוע?"*.
 * - `mood` — §11.2: *"האם הן שמחות בזמן הלמידה?"*.
 *
 * שינה ויום-ריק נשמרים **ברמת הבית** — שעת כיבוי אורות ויום ריק
 * בשבוע הם החלטות משפחתיות, לא של ילדה בודדת. ספרים ואווירה
 * נשמרים **פר-בת**, כי §11.2 שואל עליהן בנפרד.
 */

export function monthKey(now: number = Date.now()): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  const names = [
    "ינואר",
    "פברואר",
    "מרץ",
    "אפריל",
    "מאי",
    "יוני",
    "יולי",
    "אוגוסט",
    "ספטמבר",
    "אוקטובר",
    "נובמבר",
    "דצמבר",
  ];
  const idx = Number(m) - 1;
  return idx >= 0 && idx < 12 ? `${names[idx]} ${y}` : month;
}

// --- קריאה וכתיבה ---

export function loadLog(): FoundationEntry[] {
  return loadFoundationLog();
}

/** שמירה מחליפה רשומה קיימת לאותו חודש — אפשר לתקן. */
export function saveEntry(entry: FoundationEntry): FoundationEntry[] {
  const log = loadFoundationLog().filter((e) => e.month !== entry.month);
  const next = [...log, entry].sort((a, b) => a.month.localeCompare(b.month));
  saveFoundationLog(next);
  return next;
}

export function entryFor(
  log: readonly FoundationEntry[],
  month: string,
): FoundationEntry | null {
  return log.find((e) => e.month === month) ?? null;
}

// --- דגלים ---

/**
 * מה שדורש תשומת לב, במילות §11.2 עצמו.
 *
 * 🔴 בכוונה **אין כאן ציון**. §2 אינו מדרג בתים — הוא מצביע על
 * תנאי סף שלא מתקיים. "3 מתוך 5" היה הופך את זה לתעודה להורה,
 * וזה בדיוק ההפך מהכוונה.
 */
export type FoundationFlag = {
  readonly row: "sleep" | "books" | "emptyDay" | "mood";
  readonly text: string;
  /** מי מהבנות. null = ברמת הבית. */
  readonly profileId: string | null;
};

export function flagsFor(
  entry: FoundationEntry,
  profiles: readonly Profile[],
): FoundationFlag[] {
  const flags: FoundationFlag[] = [];

  // §11.2: "האם שתיהן ישנות 9–11 שעות? אם לא — זה מקור הכל"
  if (entry.sleep === "no") {
    flags.push({
      row: "sleep",
      profileId: null,
      text: "שינה מתחת ל-9 שעות. §2 קורא לזה מקור הכל — כדאי להתחיל מכאן, לפני כל שאר הדברים.",
    });
  } else if (entry.sleep === "mostly") {
    flags.push({
      row: "sleep",
      profileId: null,
      text: "השינה לא יציבה. שווה לבדוק מה קורה בלילות החריגים.",
    });
  }

  // §11.2: "האם היה יום ריק מוחלט בכל שבוע? אם לא — מעמיסות"
  if (entry.emptyDay === "none") {
    flags.push({
      row: "emptyDay",
      profileId: null,
      text: "לא היה יום ריק. §2 מזהיר שזה סימן להעמסה — שעמום הוא תנאי, לא בזבוז.",
    });
  }

  for (const p of profiles) {
    // §11.2: "כמה ספרים סיימו החודש? פחות מ-1 = בעיה"
    if (entry.books[p.id] === "none") {
      flags.push({
        row: "books",
        profileId: p.id,
        text: `${p.name} — לא נרשם ספר שהושלם החודש. המסמך מסמן פחות מאחד כבעיה.`,
      });
    }

    // §11.2: "האם הן שמחות בזמן הלמידה? אם לא — משהו לא עובד"
    if (entry.mood[p.id] === "not_happy") {
      flags.push({
        row: "mood",
        profileId: p.id,
        text: `${p.name} — לא נרשמה שמחה בלמידה. לפי §11.2 זה סימן שמשהו בשיטה לא עובד — כדאי לבדוק את הקצב ואת רמת הקושי.`,
      });
    }
  }

  return flags;
}

/**
 * האם החודש הנוכחי כבר מולא.
 * משמש את הדשבורד כדי להזכיר בעדינות — **בלי streak ובלי נדנוד**
 * (guardrails §4: אין gamification בצד ההורה).
 */
export function isFilledFor(
  log: readonly FoundationEntry[],
  month: string,
): boolean {
  return entryFor(log, month) !== null;
}

/** כמה חודשים ברצף לא מולאו — לתזכורת רכה בלבד, לא לניקוד. */
export function monthsSinceLastEntry(
  log: readonly FoundationEntry[],
  now: number = Date.now(),
): number | null {
  if (log.length === 0) return null;
  const last = log[log.length - 1]!.month;
  const [ly, lm] = last.split("-").map(Number);
  const d = new Date(now);
  const cy = d.getFullYear();
  const cm = d.getMonth() + 1;
  return (cy - (ly ?? cy)) * 12 + (cm - (lm ?? cm));
}
