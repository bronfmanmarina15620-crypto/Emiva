import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// שער-הסקירה — הבדיקה ששומרת על השומר עצמו.
//
// הרקע: ב-2026-08-22 סודרו המשימות לתתי-תיקיות לפי סטטוס
// (`tasks/active/<ID>/`, `tasks/done/<ID>/`). ההוק זיהה משימות דרך
// `^tasks/[A-Z].*/INSTRUCTIONS\.md$` — ביטוי שנשען על כך שהסגמנט
// הראשון אחרי `tasks/` מתחיל באות גדולה.
//
// הלקח המרכזי: `active` מתחיל באות קטנה, ולכן ההוק היה מפסיק לזהות
// משימות לגמרי — **בלי הודעה ובלי קוד-שגיאה**. קומיטים היו עוברים
// בלי סקירת-קוד, וזה בדיוק הכשל שההוק נולד למנוע (T1+T2 של הפוניקה,
// 2026-08-10, שבהם הבדיקות היו ירוקות והסקירה בכל זאת מצאה באג
// שהחזיר את המשימה לנקודת-הפתיחה).
//
// כשל-שקט אי אפשר להבחין בו בעין. לכן הוא נכתב כאן כ-selftest
// (עקרון-איכות 1: לקח בר-קידוד נכתב כ-selftest).

const ROOT = path.resolve(__dirname, "..", "..");
const HOOK = path.join(ROOT, ".claude", "hooks", "require-review.sh");

const tmpRoots: string[] = [];

afterAll(() => {
  for (const dir of tmpRoots) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

type Fixture = {
  /** קבצים ב-staging של הקומיט המדומה. */
  staged: string[];
  /** תוכניות שקיימות תחת plans/. */
  plans?: string[];
  /** האם קיים סימון-סקירה תקף. */
  reviewed?: boolean;
};

/**
 * בונה ריפו-git זמני, מעמיד staging לפי ה-fixture, ומריץ את ההוק
 * עם קלט של `git commit`. מחזיר פלט + קוד יציאה.
 *
 * ריפו אמיתי ולא mock: ההוק קורא ל-`git diff --cached`, ובדיקה
 * שמזייפת את git הייתה בודקת את המוק במקום את ההוק.
 */
function runHook({ staged, plans = [], reviewed = false }: Fixture) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "emiva-hook-"));
  tmpRoots.push(dir);

  execFileSync("git", ["init", "-q"], { cwd: dir });

  for (const rel of [...staged, ...plans.map((p) => `plans/${p}`)]) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, "x\n");
  }
  if (staged.length > 0) {
    execFileSync("git", ["add", "-f", ...staged], { cwd: dir });
  }

  if (reviewed) {
    const marker = path.join(dir, ".claude", ".review-done");
    fs.mkdirSync(path.dirname(marker), { recursive: true });
    fs.writeFileSync(marker, "");
    // הסימון תקף רק אם הוא חדש מהקוד — מקדמים אותו לעתיד.
    const future = new Date(Date.now() + 60_000);
    fs.utimesSync(marker, future, future);
  }

  const input = JSON.stringify({ tool_input: { command: "git commit -m x" } });
  try {
    const stdout = execFileSync("bash", [HOOK], {
      cwd: dir,
      input,
      encoding: "utf8",
      env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
      timeout: 60_000,
    });
    return { output: stdout, status: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      output: `${e.stdout ?? ""}${e.stderr ?? ""}`,
      status: e.status ?? 1,
    };
  }
}

const SRC = "src/lib/types.ts";

describe("שער-הסקירה — זיהוי קובץ-משימה", () => {
  it("קיים ורשום כ-PreToolUse ב-settings.json", () => {
    expect(fs.existsSync(HOOK)).toBe(true);
    const settings = fs.readFileSync(
      path.join(ROOT, ".claude", "settings.json"),
      "utf8",
    );
    expect(settings).toContain("require-review.sh");
  });

  // הלב של הבדיקה: המבנה החדש, באותיות קטנות.
  it("חוסם קומיט על משימה תחת tasks/active/ (המבנה הנוכחי)", () => {
    const res = runHook({
      staged: [SRC, "tasks/active/ACCOUNTS-001/INSTRUCTIONS.md"],
    });
    expect(res.status).toBe(2);
    expect(res.output).toContain("חסום");
  });

  it("חוסם קומיט על משימה תחת tasks/done/", () => {
    const res = runHook({
      staged: [SRC, "tasks/done/MATH-MVP-001/INSTRUCTIONS.md"],
    });
    expect(res.status).toBe(2);
  });

  it("חוסם גם על המבנה השטוח הישן tasks/<ID>/", () => {
    const res = runHook({
      staged: [SRC, "tasks/LEGACY-001/INSTRUCTIONS.md"],
    });
    expect(res.status).toBe(2);
  });

  // שמירה מפני הכשל-השקט עצמו: אם מישהו יחזיר ביטוי תלוי-רישיות,
  // תיקייה באותיות קטנות תחזור להחליק מתחת לרדאר.
  it("שם-תיקייה באותיות קטנות אינו מכבה את השער", () => {
    for (const bucket of ["active", "done"]) {
      const res = runHook({
        staged: [SRC, `tasks/${bucket}/X-001/INSTRUCTIONS.md`],
      });
      expect(res.status, `${bucket} החליק מתחת לשער`).toBe(2);
    }
  });
});

describe("שער-הסקירה — מה עובר חופשי", () => {
  it("קומיט תיעוד בלבד (בלי src/) עובר", () => {
    const res = runHook({
      staged: ["tasks/active/ACCOUNTS-001/INSTRUCTIONS.md", "ROADMAP.md"],
    });
    expect(res.status).toBe(0);
  });

  it("קומיט קוד בלי קובץ-משימה עובר", () => {
    const res = runHook({ staged: [SRC] });
    expect(res.status).toBe(0);
  });

  it("קבצים רופפים תחת tasks/ אינם נחשבים קובץ-משימה", () => {
    const res = runHook({ staged: [SRC, "tasks/BACKLOG.md"] });
    expect(res.status).toBe(0);
  });

  it("ארטיפקט נלווה במשימה (research.md) אינו מפעיל את השער לבדו", () => {
    const res = runHook({
      staged: [SRC, "tasks/done/DASHBOARD-PARENT-001/research.md"],
    });
    expect(res.status).toBe(0);
  });

  it("סימון-סקירה תקף פותח את השער", () => {
    const res = runHook({
      staged: [SRC, "tasks/active/ACCOUNTS-001/INSTRUCTIONS.md"],
      reviewed: true,
    });
    expect(res.status).toBe(0);
  });
});

describe("שער-הסקירה — גזירת ה-TASK-ID לחיפוש התוכנית", () => {
  // הבאג השני של אותו שינוי: `sed 's|^tasks/||'` החזיר "active/ACCOUNTS-001",
  // ולכן ההוק חיפש plans/active/ACCOUNTS-001.md — נתיב שלא קיים לעולם,
  // כלומר אזהרת "אין תוכנית" מדומה בכל קומיט-משימה. plans/ נשאר שטוח.
  it("מוצא את plans/<ID>.md כשהמשימה מקוננת — בלי אזהרה מדומה", () => {
    const res = runHook({
      staged: [SRC, "tasks/active/ACCOUNTS-001/INSTRUCTIONS.md"],
      plans: ["ACCOUNTS-001.md"],
    });
    expect(res.output).not.toContain("אין `plans/");
  });

  it("מזהיר בשם ה-ID החשוף, לא בנתיב עם התיקייה", () => {
    const res = runHook({
      staged: [SRC, "tasks/active/ACCOUNTS-001/INSTRUCTIONS.md"],
    });
    expect(res.output).toContain("plans/ACCOUNTS-001.md");
    expect(res.output).not.toContain("plans/active/");
  });
});
