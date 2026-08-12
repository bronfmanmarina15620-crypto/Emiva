import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// BL-009 — הבדיקה ששומרת על בודק-הטקסים עצמו.
//
// הרקע: ADR-002 יצר סוכנים שמייצרים טיוטות שבועיות. הם שתקו חמישה
// שבועות (W28–W32) בזמן שהריפו היה פעיל, ו-14 טיוטות הצטברו בענפים
// מרוחקים — הכל בשקט, שלושה חודשים, כי שום דבר לא בדק את הפער.
//
// הלקח המרכזי: כל בדיקה שנעשתה אז ספרה **קבצים מקומיים**, בזמן
// שחוזה ה-output של ADR-002 שולח את הטיוטה ל-branch. כלומר הבדיקה
// דיווחה "לא רץ" על תהליך שרץ. הטסטים כאן מוודאים שהבודק החדש
// אינו חוזר על אותה טעות.

const ROOT = path.resolve(__dirname, "..", "..");
const SCRIPT = path.join(ROOT, "scripts", "check-rituals.mjs");

/** מריץ את הבודק עם תאריך מוזרק, ומחזיר פלט + קוד יציאה. */
function run(nowIso: string) {
  try {
    const stdout = execFileSync("node", [SCRIPT], {
      encoding: "utf8",
      env: { ...process.env, EMIVA_NOW: nowIso },
      timeout: 60_000,
    });
    return { stdout, status: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return { stdout: `${e.stdout ?? ""}${e.stderr ?? ""}`, status: e.status ?? 1 };
  }
}

describe("BL-009 — בודק קצב הטקסים", () => {
  it("קיים ומחובר לפקודה", () => {
    expect(fs.existsSync(SCRIPT)).toBe(true);
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
    );
    expect(pkg.scripts["rituals:check"]).toContain("check-rituals");
  });

  it("בודק ענפים מרוחקים ולא רק קבצים מקומיים", () => {
    // זו הנסיגה שהכי חשוב למנוע. בדיקה שסופרת רק מקומית תדווח
    // "הכל תקין" בזמן ש-14 טיוטות תלויות — בדיוק מה שקרה.
    const src = fs.readFileSync(SCRIPT, "utf8");
    expect(src).toContain("branch");
    expect(src).toMatch(/-r\b/);
  });

  it("מזריק זמן, כדי שהבדיקה לא תפוג עם חלוף הזמן", () => {
    // בלי הזרקה, כל טסט שנכתב על הבודק היה נשבר לבד בעוד חודש.
    const src = fs.readFileSync(SCRIPT, "utf8");
    expect(src).toContain("EMIVA_NOW");
  });

  it("רץ ומדפיס דוח", () => {
    const { stdout } = run("2026-08-12T12:00:00Z");
    expect(stdout).toContain("בדיקת קצב הטקסים");
  });

  it("יוצא עם קוד שגיאה כשיש פיגור אמיתי", () => {
    // נבדק בעתיד רחוק, שבו בהכרח חסרים יומנים — כך שהבדיקה בודקת
    // את **היכולת** לדווח ולא את מצב הריפו היום. הגרסה הראשונה
    // כאן ציפתה לפיגור קיים, ונשברה ברגע שהפיגור נסגר.
    const { stdout, status } = run("2027-06-01T12:00:00Z");
    expect(status).toBe(1);
    expect(stdout).toContain("🔴");
  });

  it("יודע לבדוק את תיקיית אבני-הדרך", () => {
    // נבדקת ה**יכולת**, לא המצב הרגעי: כשהטסט נכתב התיקייה הייתה
    // חסרה והבדיקה דיווחה עליה, ואז היא נוצרה — והטסט נשבר. טסט
    // שתלוי במצב זמני מת ברגע שהבעיה נפתרת, וזו בדיוק בדיקה
    // שלא שומרת על כלום.
    const src = fs.readFileSync(SCRIPT, "utf8");
    expect(src).toContain("milestones");
    expect(src).toContain("MILESTONE_DIR");
  });

  it("שותק כשהכול תקין ואינו מדווח פיגור מזויף", () => {
    // בודק רועש הופך לבודק שמתעלמים ממנו. חייב להיות מסלול שקט.
    const src = fs.readFileSync(SCRIPT, "utf8");
    expect(src).toContain("הטקסים מעודכנים");

    // ובפועל, לא רק בקוד: המצב הנוכחי תקין ולכן הריצה חייבת
    // לצאת 0. זו הבדיקה שתיכשל אם הבודק יתחיל לרעוש שוב.
    const { status } = run("2026-08-12T12:00:00Z");
    expect(status).toBe(0);
  });

  it("סיכום-טווח נחשב כיסוי לכל השבועות שבתוכו", () => {
    // נתפס שעה אחרי שהבודק נכתב: הוא דיווח 🔴 על 8 שבועות שכולם
    // מכוסים ב-`2026-סיכום-רטרו-W17-W33.md`. סיכום כזה נכתב בדיוק
    // כדי להחליף 14 קריאות באחת, ובודק שמתעלם ממנו מדווח פיגור על
    // עבודה שנעשתה — ואז מפסיקים להריץ אותו.
    const src = fs.readFileSync(SCRIPT, "utf8");
    expect(src).toMatch(/W\(\?:\\d\{2\}\)|W\(\\d\{2\}\)-W/);

    const { stdout } = run("2026-08-12T12:00:00Z");
    expect(stdout).not.toContain("2026-W28");
  });

  it("אינו כותב דבר — קריאה בלבד", () => {
    // בודק שמתקן לבד הופך לסוכן שמייצר תוכן בלי בקרה. ההפרדה הזו
    // מכוונת: הבודק אומר מה חסר, אדם מחליט מה לעשות.
    const src = fs.readFileSync(SCRIPT, "utf8");
    expect(src).not.toContain("writeFileSync");
    expect(src).not.toContain("mkdirSync");
  });

  it("חלון הבדיקה מוגבל ואינו סורק היסטוריה רחוקה", () => {
    // בלי חלון, הבודק היה מדווח על כל שבוע מאז תחילת השנה ולכן
    // רועש מכדי שיריצו אותו. פער יולי כבר חולץ לסיכום רטרו נפרד.
    const src = fs.readFileSync(SCRIPT, "utf8");
    expect(src).toContain("LOOKBACK_WEEKS");
  });
});
