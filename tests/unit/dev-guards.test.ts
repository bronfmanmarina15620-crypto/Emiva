import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// BL-002 — ההגנות סביב שרת-הפיתוח והבנייה.
//
// הרקע: המסקנה *"לא מריצים build בזמן ששרת פיתוח חי"* נרשמה ב-BACKLOG
// ב-2026-08-10 כפרוזה בלבד, אחרי ששלוש בניות רצופות נפלו על שגיאה
// שנראתה כמו באג בקוד ולא הייתה. פרוזה לא הגנה על כלום — הבנייה המשיכה
// לרוץ בלי שער. הבדיקות כאן מקודדות את הלקח (עקרון-איכות #1), כך
// שאם ההגנה תוסר או תישבר בשקט, משהו ייכשל בקול.

const ROOT = path.resolve(__dirname, "..", "..");
const SCRIPTS = path.join(ROOT, "scripts");

/** מריץ סקריפט node ומחזיר פלט + קוד יציאה, בלי לזרוק על כישלון. */
function runScript(relPath: string, env: Record<string, string> = {}) {
  try {
    const stdout = execFileSync("node", [path.join(SCRIPTS, relPath)], {
      encoding: "utf8",
      env: { ...process.env, ...env },
      // הבדיקה לא אמורה לבנות באמת — רק להגיע להחלטת השער ולעצור.
      timeout: 60_000,
    });
    return { stdout, status: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: `${e.stdout ?? ""}${e.stderr ?? ""}`,
      status: e.status ?? 1,
    };
  }
}

describe("BL-002 — מודול איתור שרתי-פיתוח משותף", () => {
  it("קיים כמקור אחד, ולא מגולגל מחדש בכל סקריפט", () => {
    // שלושה צרכנים נשענים עליו. עותק שני של לוגיקת האיתור הוא בדיוק
    // הדפוס שנשבר בשקט ב-2026-08-10.
    expect(fs.existsSync(path.join(SCRIPTS, "lib", "find-dev-servers.mjs"))).toBe(
      true,
    );

    for (const consumer of [
      "dev-restart.mjs",
      "dev-status.mjs",
      "guard-build.mjs",
    ]) {
      const src = fs.readFileSync(path.join(SCRIPTS, consumer), "utf8");
      expect(src).toContain("find-dev-servers.mjs");
    }
  });

  it("מחזיר מערך PIDs ולא זורק, גם כשאין שרת חי", async () => {
    // @ts-expect-error — סקריפט .mjs בלי טיפוסים; הבדיקה מריצה אותו כפי שהוא.
    const mod = await import("../../scripts/lib/find-dev-servers.mjs");
    const result = mod.findDevServerPids();

    expect(Array.isArray(result.pids)).toBe(true);
    expect(typeof result.detectionFailed).toBe("boolean");
    // כל PID חייב להיות מספר — מחרוזת ריקה שמחליקה פנימה תגרום
    // ל-taskkill לרוץ על יעד לא-מוגדר.
    for (const pid of result.pids) expect(pid).toMatch(/^\d+$/);
  });
});

describe("BL-002 — שומר הבנייה", () => {
  it("`npm run build` עובר דרך השומר ולא ישירות ל-next build", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
    );
    // זו הבדיקה שמונעת את הנסיגה האמיתית: מישהו "מפשט" את הסקריפט
    // בחזרה ל-`next build`, וההגנה נעלמת בלי שאף אחד ישים לב.
    expect(pkg.scripts.build).toContain("guard-build");
    expect(pkg.scripts.build).not.toBe("next build");
  });

  it("יש פקודת סטטוס שרק מציגה, בלי לסגור שרתים", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
    );
    expect(pkg.scripts["dev:status"]).toContain("dev-status");

    // חשוב שהיא תישאר קריאה-בלבד: פקודה שמסתכלת אבל גם הורגת תהליכים
    // היא הדבר הלא-נכון להריץ כשרק רוצים לבדוק.
    const src = fs.readFileSync(path.join(SCRIPTS, "dev-status.mjs"), "utf8");
    expect(src).not.toContain("taskkill");
    expect(src).not.toContain("kill");
  });

  it("למעקף יש שם מפורש, כדי ששער לא יהפוך לחסם", () => {
    const src = fs.readFileSync(path.join(SCRIPTS, "guard-build.mjs"), "utf8");
    expect(src).toContain("EMIVA_SKIP_BUILD_GUARD");
  });

  it("איתור שנכשל מזהיר וממשיך — לא חוסם בנייה", () => {
    const src = fs.readFileSync(path.join(SCRIPTS, "guard-build.mjs"), "utf8");
    // `detectionFailed` חייב להוביל להמשך ולא ל-exit. שער שחוסם בגלל
    // תקלה בכלי שלו עצמו מאמן את המשתמשת לעקוף אותו תמיד.
    const failedBranch = src.slice(src.indexOf("detectionFailed"));
    const untilNextBranch = failedBranch.slice(0, failedBranch.indexOf("} else"));
    expect(untilNextBranch).not.toContain("process.exit");
  });

  it("הודעת החסימה בעברית ומסבירה מה לעשות", () => {
    const src = fs.readFileSync(path.join(SCRIPTS, "guard-build.mjs"), "utf8");
    // ההודעה היא כל הערך של השער — הודעה סתומה שולחת לחפש באג בקוד,
    // וזה בדיוק מה שבזבז את הזמן ב-2026-08-10.
    expect(src).toContain("מה לעשות");
    expect(src).toMatch(/שרת/);
  });
});
