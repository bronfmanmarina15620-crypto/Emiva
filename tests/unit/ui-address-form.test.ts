import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * GENDER-INCLUSIVE-001 — **טקסט של מסך אינו פטור מלשון-הפנייה.**
 *
 * מקור: סשן חי (Marina, 2026-08-14). פרופיל שהוגדר בלשון זכר קיבל
 * *"מוכנה להתחיל?"* — כי המחרוזת הייתה כתובה ישירות ב-JSX של
 * `session/page.tsx` ולא עברה דרך מנגנון לשון-הפנייה.
 *
 * **למה זה חמק:** G2 ניטרלה את `feedback-messages.ts` ואת
 * `greetings.ts` וכתבה 109 בדיקות — כולן על **ספריות ההודעות**.
 * אף בדיקה לא הסתכלה על המסכים עצמם, ולכן טקסט שיושב ב-JSX נשאר
 * מחוץ לרשת. הבדיקות היו ירוקות בזמן שילד ראה לשון שגויה.
 *
 * **מה הבדיקה הזאת עושה:** סורקת את קבצי המסכים ומחפשת צורות
 * שמסגירות מין. מחרוזת כזאת חייבת לעבור דרך מאגר עם `AddressForm`
 * (כלומר לחיות ב-`feedback-messages.ts`), ולא להיכתב ישירות.
 */

const APP_ROOT = join(process.cwd(), "src", "app");

/**
 * **רק צורות שבאמת מסגירות מין.**
 *
 * `ענית`, `חזרת`, `הגעת` — זמן עבר גוף שני, **זהות בשתי הלשונות**
 * ולכן מותרות. הרשימה כאן היא הווה/ציווי, שבהן העברית מפרידה.
 */
const GENDERED = [
  "מוכנה",
  "מוכן ",
  "בואי",
  "נסי ",
  "תוכלי",
  "יכולה",
  "רוצה את",
  "מצוינת",
  "יודעת",
  "בטוחה",
  "מתחילות",
];

/** מסכי-הורה מדברים אל Marina, לא אל הילד/ה — הם מחוץ לתחום. */
const EXEMPT_DIRS = ["parent", "journal"];

function screenFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (EXEMPT_DIRS.includes(entry)) continue;
      screenFiles(full, acc);
    } else if (entry.endsWith(".tsx")) {
      acc.push(full);
    }
  }
  return acc;
}

/** שולף רק טקסט שהילד/ה באמת רואה: בין תגיות, או מחרוזת ב-JSX. */
function visibleText(source: string): string[] {
  const out: string[] = [];
  // טקסט עברי בין > ל-<
  for (const m of source.matchAll(/>([^<>{}]*[א-ת][^<>{}]*)</g)) {
    out.push(m[1]!);
  }
  // מחרוזות עבריות (placeholder, aria-label, וכו')
  for (const m of source.matchAll(/"([^"]*[א-ת][^"]*)"/g)) {
    out.push(m[1]!);
  }
  return out;
}

describe("GENDER-INCLUSIVE-001 — מסכים לא מקבעים לשון", () => {
  const files = screenFiles(APP_ROOT);

  it("יש בכלל מסכים לסרוק (שער-שפיות)", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("אף מסך שפונה לילד/ה אינו מקבע צורה מגדרית", () => {
    const violations: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const text of visibleText(source)) {
        for (const word of GENDERED) {
          if (text.includes(word)) {
            violations.push(
              `${file.replace(process.cwd(), "").replace(/\\/g, "/")}: "${text.trim()}" — מכיל "${word.trim()}"`,
            );
          }
        }
      }
    }
    expect(
      violations,
      `מחרוזות מגודרות שכתובות ישירות במסך. הן חייבות לעבור דרך מאגר עם AddressForm ב-feedback-messages.ts:\n${violations.join("\n")}`,
    ).toEqual([]);
  });

  /** falsifier: אם הסורק אינו רואה טקסט-מסך, הבדיקה למעלה ירוקה לשווא. */
  it("הסורק באמת רואה טקסט מגודר כשהוא קיים", () => {
    const sample = `<p className="x">מוכנה להתחיל?</p>`;
    const found = visibleText(sample).some((t) =>
      GENDERED.some((w) => t.includes(w)),
    );
    expect(found, "הסורק לא זיהה מחרוזת מגודרת מובהקת").toBe(true);
  });

  /** צורות זהות בשתי הלשונות אינן אמורות להיתפס. */
  it("אינה פוסלת זמן-עבר גוף-שני (זהה בשתי הלשונות)", () => {
    const sample = `<p>ענית נכון! חזרת והגעת ליעד</p>`;
    const found = visibleText(sample).some((t) =>
      GENDERED.some((w) => t.includes(w)),
    );
    expect(found).toBe(false);
  });
});
