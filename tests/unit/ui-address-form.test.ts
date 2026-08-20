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
 * **גם `src/lib` נסרק** (נוסף 2026-08-19, סקירת-קוד).
 *
 * ארבע תוויות-השלב ביומן הגור (*"לומדות"*, *"מתאמנות"*…) ישבו
 * ב-`src/lib/puppy-journal.ts` ונראו על מסך של ילדה — והשומר לא
 * ראה אותן כלל, כי סרק `src/app` בלבד. מחרוזת שמוצגת לילד/ה אינה
 * פטורה בגלל התיקייה שבה היא יושבת.
 */
const LIB_ROOT = join(process.cwd(), "src", "lib");

/**
 * **גם `src/components` נסרק** (נוסף 2026-08-20, בדיקה חזותית של האתר החי).
 *
 * *"כבר מכיר/ה את החומר"* ישב ב-`StartingLevelPicker.tsx` ונראה
 * במסך יצירת הפרופיל — והשומר לא ראה אותו כלל, כי סרק `src/app`
 * ואת רשימת ה-`lib` בלבד.
 *
 * **זו הפעם השלישית שאותו כשל חוזר**: תחילה נסרק `src/app` בלבד,
 * ב-19.8 נוסף `src/lib`, ו-`src/components` נשאר בחוץ. הסריקה
 * כאן היא של כל התיקייה (ולא רשימה מפורשת כמו ב-`lib`) בדיוק
 * כדי שקובץ-רכיב חדש ייכנס לשומר מעצמו, בלי שמישהו יזכור.
 */
const COMPONENTS_ROOT = join(process.cwd(), "src", "components");

/**
 * **קובצי-`lib` שמחזיקים תוויות שהילד/ה רואה** — רשימה מפורשת.
 *
 * *למה רשימה ולא סריקה של כל `src/lib`:* `visibleText` נכתב ל-JSX,
 * ועל קובץ לוגיקה הוא שולף גם הערות וקוד (נמדד: ~8 התרעות-שווא מתוך
 * `telemetry.ts`, `adaptive.ts` וכד'). שומר שמתריע על הערות מאמן
 * את הקורא להתעלם ממנו.
 *
 * *למה בכל זאת צריך:* ארבע תוויות-השלב ביומן הגור (*"לומדות"*,
 * *"מתאמנות"*…) ישבו כאן ונראו על מסך של ילדה — והשומר לא ראה אותן
 * כלל, כי סרק `src/app` בלבד (סקירת-קוד 2026-08-19).
 *
 * **`feedback-messages.ts` ו-`greetings.ts` אינם ברשימה בכוונה** —
 * הם היעד שהבדיקה דוחפת אליו. מחרוזת מגודרת חוקית שם, בתוך
 * `feminine:`/`masculine:`, כי היא נבחרת לפי `addressForm`. הכיסוי
 * שלהם ב-`feedback-messages.test.ts` (≥2 וריאציות · בלי לוכסנים ·
 * הניטרלי אינו מדליף מגדר).
 *
 * **קובץ חדש עם תוויות לילד/ה — להוסיף לכאן.**
 */
const CHILD_LABEL_LIB_FILES = ["puppy-journal.ts"];

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

/**
 * **ציוויים בנקבה** — הורחב 2026-08-19 אחרי סקירת-קוד.
 *
 * הרשימה למעלה כיסתה הווה/תואר בלבד, ולכן *"פתחי את יומן הגור"*
 * (מסך הבית) ו-*"הוסיפי משתמשת"* עברו אותה בשקט. ציווי הוא **הצורה
 * הנפוצה ביותר** בפנייה לילד/ה — בדיוק מה ששומר-לשון חייב לתפוס.
 *
 * **למה בנפרד ולא באותה רשימה:** ציווי קצר הוא תת-מחרוזת של מילים
 * תמימות — `עשי` יושב בתוך *"עשינו"*, `עני` בתוך *"מעניין"* ובתוך
 * *"ענית"*. לכן כאן נדרש גבול-מילה אמיתי ולא `includes` פשוט
 * (נמדד: בלי הגבול נוצרו חמש התרעות-שווא על טקסט תקין).
 */
const GENDERED_IMPERATIVES = [
  "פתחי", "סמני", "בחרי", "כתבי", "ציירי", "הוסיפי", "שמרי", "קחי",
  "אמרי", "לחצי", "מלאי", "ספרי", "חזרי", "הקשיבי", "תרצי", "תגדלי",
  "עשי", "שבי", "בדקי", "חשבי", "מצאי", "קראי", "המשיכי", "התחילי",
  "סיימי", "גזרי", "הדביקי", "עני",
];

/**
 * ציווי עם גבולות-מילה עבריים. `` של JS אינו עובד אחרי אות עברית
 * (הלקח מ-BL-002, מתועד גם ב-`word-problem-phrasing.test.ts`), ולכן
 * הגבול נאכף ידנית: לפני ואחרי המילה לא תעמוד אות עברית.
 */
function imperativeIn(text: string): string | null {
  for (const word of GENDERED_IMPERATIVES) {
    if (new RegExp(`(^|[^א-ת])${word}([^א-ת]|$)`).test(text)) return word;
  }
  return null;
}

/**
 * מסכי-הורה מדברים אל Marina, לא אל הילד/ה — הם מחוץ לתחום.
 *
 * **`journal` הוסר מהרשימה (2026-08-19, סקירת-קוד).** ההערה כאן
 * טענה "מסכי-הורה", אבל יומן הגור הוא **מסך של הילדה**: היא
 * פותחת אותו מכרטיס-הפרופיל שלה במסך הבית (הכפתור
 * ב-`src/app/page.tsx`; הוא עצמו אמר *"פתחי את יומן הגור"*
 * ונוטרל גם הוא).
 *
 * הפטור הפך את השומר לירוק בדיוק על המקום שבו
 * מחלקת-הבאג שהוא נועד לתפוס (*"מוכנה להתחיל?"*) הייתה
 * חיה — 8 מחרוזות מגודרות שאיש לא ראה. שומר שנראה מקיף
 * ומחריג בשקט מסך של ילדה גרוע מאין-שומר, כי סומכים עליו.
 */
const EXEMPT_DIRS = ["parent"];

/**
 * **בורר-הלשון עצמו פטור.**
 *
 * `AddressFormPicker` מציג את *"מוכנה להתחיל?"* / *"מוכן להתחיל?"*
 * כ**דוגמאות** שבהן הילדה בוחרת. הן חייבות להיות מגודרות — זה
 * בדיוק תפקידן, ולא מחרוזת שמקבעת לשון על מסך.
 */
const EXEMPT_FILES = ["AddressFormPicker.tsx"];

function screenFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (EXEMPT_DIRS.includes(entry)) continue;
      screenFiles(full, acc);
    } else if (entry.endsWith(".tsx")) {
      if (EXEMPT_FILES.includes(entry)) continue;
      acc.push(full);
    }
  }
  return acc;
}

/** שולף רק טקסט שהילד/ה באמת רואה: בין תגיות, או מחרוזת ב-JSX. */
function visibleText(source: string): string[] {
  const out: string[] = [];
  // הערות-תיעוד אינן טקסט על מסך. בלי זה השומר מתריע על פרוזה
  // בתוך /** ... */ (נמדד: "בטוחה" מתוך StartingLevelPicker), ושומר
  // שמתריע על הערות מאמן את הקורא להתעלם ממנו.
  source = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
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
  const files = [
    ...screenFiles(APP_ROOT),
    ...screenFiles(COMPONENTS_ROOT),
    ...CHILD_LABEL_LIB_FILES.map((f) => join(LIB_ROOT, f)),
  ];

  it("יש בכלל מסכים לסרוק (שער-שפיות)", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("אף מסך שפונה לילד/ה אינו מקבע צורה מגדרית", () => {
    const violations: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const text of visibleText(source)) {
        const rel = file.replace(process.cwd(), "").replace(/\\/g, "/");
        for (const word of GENDERED) {
          if (text.includes(word)) {
            violations.push(
              `${file.replace(process.cwd(), "").replace(/\\/g, "/")}: "${text.trim()}" — מכיל "${word.trim()}"`,
            );
          }
        }
        const imperative = imperativeIn(text);
        if (imperative) {
          violations.push(
            `${rel}: "${text.trim()}" — ציווי בנקבה "${imperative}"`,
          );
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
  /** falsifier: השומר באמת תופס ציווי בנקבה. */
  it("הסורק תופס ציווי בנקבה", () => {
    expect(imperativeIn("פתחי את יומן הגור")).toBe("פתחי");
    expect(imperativeIn("הוסיפי משתמשת")).toBe("הוסיפי");
  });

  /**
   * הלקח שהוליד את גבול-המילה: ציווי קצר הוא תת-מחרוזת של מילה
   * תמימה. בלי הגבול חמש המחרוזות האלה היו נפסלות בטעות.
   */
  it("אינה פוסלת מילים תמימות שמכילות ציווי כתת-מחרוזת", () => {
    for (const ok of [
      "עשינו, לא קרה כלום",
      "מה היה הכי מעניין?",
      "ענית נכון",
      "השם והגיל נשמרים על המכשיר",
      "אנחנו מכינים תכנים בשבילך",
    ]) {
      expect(imperativeIn(ok), `נפסל בטעות: "${ok}"`).toBeNull();
    }
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
