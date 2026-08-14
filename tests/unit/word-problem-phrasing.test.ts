import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import addSubBank from "@/content/math/add-sub-100.json";
import addSubHoldout from "@/content/measurement/add-sub-100-holdout.json";
import multBank from "@/content/math/multiplication.json";
import multHoldout from "@/content/measurement/multiplication-holdout.json";
import barModelsBank from "@/content/math/bar-models.json";
import barModelsHoldout from "@/content/measurement/bar-models-holdout.json";
import ops1000Bank from "@/content/math/ops-1000.json";
import ops1000Holdout from "@/content/measurement/ops-1000-holdout.json";
import longDivisionBank from "@/content/math/long-division.json";
import longDivisionHoldout from "@/content/measurement/long-division-holdout.json";
import mult2digitBank from "@/content/math/mult-2digit.json";
import mult2digitHoldout from "@/content/measurement/mult-2digit-holdout.json";

/**
 * BL-022 + BL-020 — בעיה מילולית חייבת להיות שאלה שלמה.
 *
 * מקור: מישה (משתמש חיצוני, בן ~9) דיווח פעמיים
 * *"לא עד הסוף מנוסחת המשימה. חסרה מילה שמשפיעה על ההבנה."*
 *
 * ילדה שלא מבינה מה נשאל נכשלת על **פענוח ניסוח**, לא על חשבון —
 * והמערכת רושמת את זה כחוסר-שליטה. זה מזהם את אות ה-adaptive
 * difficulty בדיוק כמו הזריעה לפי גיל ב-BL-021.
 *
 * **למה לא סף-אורך:** קריאת 30 פריטי-הכסף הראתה ש-
 * *"ארנק 13₪. שילמתי 8₪ בחנות הצעצועים. כמה נשאר?"* (44 תווים)
 * ברורה לגמרי, בעוד פריטים ארוכים יותר עמומים. סף-אורך היה מייצר
 * כשלים-שקריים, ושומר שנכשל על עצמו מאמן לעקוף אותו תמיד
 * (הלקח מ-`guard-build.mjs`, BL-002 2026-08-12).
 */

/**
 * **הקריטריון: שאלה מפורשת — לא נוכחות של פועל.**
 *
 * גרסה ראשונה של הבדיקה דרשה פועל-פעולה, והיא פסלה 36 פריטים
 * תקינים לגמרי: בעברית מבע-קיום נכתב בלי פועל
 * (*"בגן א' 26 ילדים ובגן ב' 17 ילדים. כמה ילדים בשני הגנים יחד?"*).
 * זו עברית תקינה, לא באג — והבדיקה הייתה מכריחה לשכתב תוכן בריא.
 *
 * מה שמישה באמת תיאר הוא שאי-אפשר לדעת **מה נשאל**. לכן זה מה
 * שנבדק: שאלה שמסתיימת ב-`?` אמיתי, ולא בקיצור `סה"כ?` ולא
 * במשפט-הצהרה שמשאיר לילדה להמציא את השאלה בעצמה.
 */

type WordItem = { id: string; prompt: string; context?: string };

/** הקיצור שמשאיר לילדה להשלים בראש מה נשאל.
 *
 *  **כל האיותים, לא רק זה שנמצא במאגר.** גרשיים-ASCII (") וגרשיים
 *  עבריים (״ U+05F4), גרש בודד (' / ׳), וגם בלי גרש כלל (`סהכ`).
 *  סקירת-קוד (2026-08-14) הצביעה על כך שכיסוי של שני איותים בלבד
 *  מחזיר "ירוק" על בדיוק אותה רגרסיה בכתיב מעט שונה — בזמן שכתיבת
 *  התוכן היא ידנית ולכן הכתיב אינו אחיד מעצמו.
 *
 *  **מה שנוסה ונדחה:** לפסול גם `בסך הכל?` כשלעצמו. זה הפיל
 *  ארבעה פריטים תקינים לגמרי (*"כמה עטים בסך הכל?"*) — הצירוף
 *  אינו הבעיה, היעדר מילת-השאלה הוא. הכלל הנפרד למטה
 *  (`hasQuestionWord`) תופס בדיוק את זה בלי הכשל-השקרי. */
const TERSE_SHORTHAND = /(^|[.\s])סה["״'׳]?כ\s*\?$/;

/** מילות-שאלה עבריות. שאלה אמיתית אומרת **מה** מחשבים; `?` לבדו
 *  יכול לחתום גם צירוף-סיכום ריק (*"...ו-5₪ בסך הכל?"*).
 *
 *  **בלי `\b`** — הוא אינו נדלק אחרי אות עברית, ולכן ביטוי שנראה
 *  תקין היה מת בשקט. זה בדיוק הבאג שנתפס ב-BL-002 (2026-08-12).
 *  הגבול נאכף ידנית: תחילת-מחרוזת או תו-שאינו-אות-עברית. */
const QUESTION_WORDS =
  /(^|[^א-ת])(כמה|מה|מהו|מהי|איזה|איזו|בכמה|מי|כיצד|איך|האם)([^א-ת]|$)/;

function hasQuestionWord(prompt: string): boolean {
  return QUESTION_WORDS.test(prompt);
}

function hasExplicitQuestion(prompt: string): boolean {
  const t = prompt.trimEnd();
  if (!t.endsWith("?")) return false;
  if (TERSE_SHORTHAND.test(t)) return false;
  return hasQuestionWord(t);
}

function wordCount(prompt: string): number {
  return prompt.trim().split(/\s+/).filter(Boolean).length;
}

/** בעיה מילולית = יש `context`, או שיש פרוזה עברית של ≥2 מילים. */
function isWordProblem(item: WordItem): boolean {
  if (item.context) return true;
  const hebrewWords = (item.prompt.match(/[א-ת]{3,}/g) ?? []).length;
  return hebrewWords >= 2;
}

function offenders(items: readonly WordItem[]): string[] {
  return items
    .filter(isWordProblem)
    .filter((i) => !hasExplicitQuestion(i.prompt) || wordCount(i.prompt) < 4)
    .map((i) => `${i.id}: "${i.prompt}"`);
}

const BANKS: ReadonlyArray<[string, readonly WordItem[]]> = [
  ["add_sub_100", addSubBank as unknown as readonly WordItem[]],
  ["add_sub_100-holdout", addSubHoldout as unknown as readonly WordItem[]],
  ["multiplication", multBank as unknown as readonly WordItem[]],
  ["multiplication-holdout", multHoldout as unknown as readonly WordItem[]],
  ["bar_models", barModelsBank as unknown as readonly WordItem[]],
  ["bar_models-holdout", barModelsHoldout as unknown as readonly WordItem[]],
  ["ops_1000", ops1000Bank as unknown as readonly WordItem[]],
  ["ops_1000-holdout", ops1000Holdout as unknown as readonly WordItem[]],
  ["long_division", longDivisionBank as unknown as readonly WordItem[]],
  ["long_division-holdout", longDivisionHoldout as unknown as readonly WordItem[]],
  ["mult_2digit", mult2digitBank as unknown as readonly WordItem[]],
  ["mult_2digit-holdout", mult2digitHoldout as unknown as readonly WordItem[]],
];

/**
 * **חריג מתועד — מאגרי-שברים.** `fractions_intro` ו-ה-holdout שלו
 * מנוסחים ליד **ציור**: *"איזה חלק צבוע?"*. שם הקיצור הוא הצורה
 * הנכונה — הציור נושא את ההקשר, ומשפט-סיפור היה מיותר ומכביד.
 * 69 פריטים ייפלו כאן אם יוכנסו, ולכן הם מוחרגים **במפורש** ולא
 * בהשמטה שקטה (אותה תבנית כמו `ORDER_INSENSITIVE_EXEMPT`
 * ב-`measurement-holdout-purity.test.ts`).
 */
const EXEMPT_BANKS = ["fractions_intro", "fractions_intro-holdout"] as const;

/** שער-כיסוי: כל מאגר מתמטיקה נבדק או מוחרג במפורש. בלעדיו אפשר
 *  להוסיף מאגר ולקבל ירוק על סמך הישנים בלבד — בדיוק הכשל שבו
 *  `judge:content` דיווח "0 שגיאות" בלי שראה את מאגרי המדידה (T7ב).
 *
 *  **הרשימה נקראת מהדיסק, לא נכתבת ביד.** סקירת-קוד (2026-08-14)
 *  תפסה שהגרסה הראשונה השוותה רשימה-קשיחה מול רשימה-קשיחה: מי
 *  שמוסיף מאגר חדש ולא רושם אותו בשתיהן מקבל ירוק, כלומר השער
 *  שמר על עצמו בלבד. עכשיו המקור הוא תיקיות התוכן — בדיוק כמו
 *  ש-`measurement-holdout-purity` נשען על `MEASURABLE_SKILLS` האמיתי. */
const CONTENT_ROOT = join(process.cwd(), "src", "content");

function banksOnDisk(dir: string, suffix = ""): string[] {
  return readdirSync(join(CONTENT_ROOT, dir))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, "").replace(/-holdout$/, "").replace(/-/g, "_") + suffix);
}

/** מאגרי-המדידה מכילים גם עברית ואנגלית — לא מתמטיקה. אלה
 *  **הנושאים הלא-מתמטיים בלבד**; כל השאר נחשב מתמטיקה. */
const NON_MATH_MEASUREMENT = new Set([
  "hebrew_comprehension",
  "english_vocab",
]);

/** **איחוד של שתי התיקיות, לא גזירה מהתרגול.**
 *
 *  סקירת-קוד שנייה (2026-08-14) תפסה שגם הגרסה ה"נקראת-מהדיסק"
 *  הייתה עיוורת בציר אחד: היא צירפה holdout רק אם קיים קובץ-תרגול
 *  באותו שם. מאגר-מדידה שנוסף **בלי** תרגול מקביל לא נבדק כלל,
 *  והשער דיווח ירוק — בדיוק כשל T7ב ("ירוק שלא נסרק אינו ירוק"),
 *  רק על הציר השני. אומת: `geometry-holdout.json` עבר בשקט.
 *
 *  עכשיו כל קובץ בשתי התיקיות נספר, פרט לנושאים הלא-מתמטיים
 *  המפורשים למעלה. */
const ALL_MATH_BANK_NAMES = (() => {
  const names = new Set<string>();
  for (const name of banksOnDisk("math")) names.add(name);
  for (const file of readdirSync(join(CONTENT_ROOT, "measurement"))) {
    if (!file.endsWith(".json")) continue;
    const skill = file
      .replace(/\.json$/, "")
      .replace(/-holdout$/, "")
      .replace(/-/g, "_");
    if (NON_MATH_MEASUREMENT.has(skill)) continue;
    names.add(`${skill}-holdout`);
  }
  return [...names];
})();

describe("BL-022 — בעיה מילולית מנוסחת כשאלה שלמה", () => {
  for (const [name, items] of BANKS) {
    it(`${name}: כל בעיה מילולית מסתיימת בשאלה מפורשת`, () => {
      const bad = offenders(items);
      expect(bad, `פריטים שדורשים מהילדה להשלים בראש מה נשאל:\n${bad.join("\n")}`).toEqual([]);
    });
  }

  it("שער-כיסוי: כל מאגר מתמטיקה נבדק או מוחרג במפורש", () => {
    const covered = new Set([...BANKS.map(([n]) => n), ...EXEMPT_BANKS]);
    const missing = ALL_MATH_BANK_NAMES.filter((n) => !covered.has(n));
    expect(missing, `מאגרים שאינם נבדקים ואינם מוחרגים: ${missing.join(", ")}`).toEqual([]);
  });

  it("תופסת את הקיצור בכל איות — גרשיים, גרש, ובלי גרש", () => {
    const spellings = [
      'סה"כ?', // גרשיים ASCII
      "סה״כ?", // גרשיים עבריים U+05F4
      "סה'כ?", // גרש ASCII
      "סה׳כ?", // גרש עברי U+05F3
      "סהכ?", // בלי גרש כלל
    ];
    for (const s of spellings) {
      const broken: WordItem[] = [
        { id: `fake-${s}`, prompt: `סוכריה 7₪ ומסטיק 5₪. ${s}`, context: "money" },
      ];
      expect(offenders(broken), `הכתיב "${s}" חמק מהשומר`).toHaveLength(1);
    }
  });

  it("סימן-שאלה בלי מילת-שאלה אינו שאלה — אבל 'בסך הכל' תקין בתוך שאלה", () => {
    // צירוף-סיכום ריק: נגמר ב-? ובכל זאת לא אומר מה מחשבים
    expect(
      offenders([
        { id: "fake-sum", prompt: "קניתי צעצוע ב-37₪ ומחברת ב-8₪ בסך הכל?", context: "money" },
      ]),
    ).toHaveLength(1);
    // אותו צירוף בדיוק, עם מילת-שאלה — תקין לחלוטין (ארבעה פריטי
    // bar_models אמיתיים נראים כך; גרסה מוקדמת של השומר פסלה אותם)
    expect(
      offenders([
        { id: "ok-sum", prompt: "לדני 4 עטים כחולים ו-3 אדומים. כמה עטים בסך הכל?" },
      ]),
    ).toEqual([]);
  });

  /** falsifier לשער-הכיסוי עצמו: אם הוא נשען על רשימה-קשיחה במקום
   *  על הדיסק, הבדיקה הזאת עוברת בטעות ולא מזהה מאגר לא-רשום. */
  it("שער-הכיסוי נגזר מהדיסק ומכסה כל קובץ מתמטיקה בפועל", () => {
    const filesOnDisk = readdirSync(join(CONTENT_ROOT, "math")).filter((f) =>
      f.endsWith(".json"),
    );
    expect(filesOnDisk.length).toBeGreaterThan(0);
    // כל קובץ תרגול על הדיסק מיוצג בשמות שהשער בודק
    for (const f of filesOnDisk) {
      const name = f.replace(/\.json$/, "").replace(/-/g, "_");
      expect(ALL_MATH_BANK_NAMES, `${f} אינו מכוסה בשער`).toContain(name);
    }
  });

  it("הבדיקה באמת תופסת את שלוש הצורות השבורות (falsifier)", () => {
    const broken: WordItem[] = [
      // קיצור שמשאיר לילדה להשלים מה נשאל
      { id: "fake-1", prompt: 'סוכריה 7₪ ומסטיק 5₪. סה"כ?', context: "money" },
      // משפט-הצהרה בלי שאלה כלל
      { id: "fake-2", prompt: "9 צמידי גומי בחנות צעצועים, 6₪ כל אחד.", context: "money" },
      // קצר מדי מכדי להיות סיטואציה
      { id: "fake-3", prompt: "42₪ ו-5₪?", context: "money" },
    ];
    expect(offenders(broken)).toHaveLength(3);
  });

  it("אינה פוסלת מבע-קיום עברי תקין (הרגרסיה שתפסה 36 פריטים בריאים)", () => {
    const fine: WordItem[] = [
      // בלי פועל-פעולה — ועדיין ברור לחלוטין
      { id: "ok-1", prompt: "בגן א' 26 ילדים ובגן ב' 17 ילדים. כמה ילדים בשני הגנים יחד?" },
      { id: "ok-2", prompt: "לרותם 41 שקלים ולשירה 26. בכמה יותר לרותם?" },
      {
        id: "ok-3",
        prompt: "ארנק 13₪. שילמתי 8₪ בחנות הצעצועים. כמה נשאר?",
        context: "money",
      },
      {
        id: "ok-4",
        prompt: "קניתי גלידה ב-3₪ וסוכריה ב-4₪. כמה שילמתי?",
        context: "money",
      },
    ];
    expect(offenders(fine)).toEqual([]);
  });
});
