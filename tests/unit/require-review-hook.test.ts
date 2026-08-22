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
  /** תוכן גולמי לסימון — לבדיקת רשומות פגומות. */
  markerBody?: string;
};

/**
 * בונה ריפו-git זמני, מעמיד staging לפי ה-fixture, ומריץ את ההוק
 * עם קלט של `git commit`. מחזיר פלט + קוד יציאה.
 *
 * ריפו אמיתי ולא mock: ההוק קורא ל-`git diff --cached`, ובדיקה
 * שמזייפת את git הייתה בודקת את המוק במקום את ההוק.
 */
function runHook({ staged, plans = [], reviewed = false, markerBody }: Fixture) {
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

  if (reviewed || markerBody !== undefined) {
    const marker = path.join(dir, ".claude", ".review-done");
    fs.mkdirSync(path.dirname(marker), { recursive: true });
    // ברירת-המחדל היא **רשומה תקינה**, לא קובץ ריק. עד 22.8 הבדיקה
    // כתבה `""` — כלומר היא אישרה בדיוק את הסימון-הריק שהשער נועד
    // לפסול, ולכן "סימון תקף" ו-`touch` נראו לה זהים.
    // ברירת-המחדל מכסה את **כל** הקבצים שמקומטים — כמו שרשומה
    // אמיתית עושה. השער משווה מול `files`, לא מול mtime בלבד.
    fs.writeFileSync(
      marker,
      markerBody ??
        JSON.stringify({ findings: 0, fixed: 0, waived: false, files: staged }),
    );
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

  /**
   * 🔴 שלוש הבדיקות האלה **התהפכו ב-2026-08-22**, והן הראיה שהבאג
   * היה אמיתי.
   *
   * עד אז הן טענו ש"קוד בלי קובץ-משימה **עובר**" — כלומר הן קיבעו
   * את **פיצול-הקומיט** כהתנהגות רצויה: קומיט אחד עם הקוד, קומיט
   * שני עם ה-INSTRUCTIONS, ושניהם עוברים בשקט. זו הייתה עקיפה
   * מלאה של השער, בשתי פקודות, בלי שום הודעה.
   *
   * בדיקה יכולה לקבע באג בדיוק כמו שהיא מגינה מפניו. הן הפכו
   * לדרישה ההפוכה: **כל** קומיט שנוגע בקוד דורש סקירה.
   */
  it("קומיט קוד בלי קובץ-משימה נחסם (פיצול-קומיט אינו עוקף)", () => {
    const res = runHook({ staged: [SRC] });
    expect(res.status).toBe(2);
  });

  it("קוד + קובץ רופף תחת tasks/ עדיין דורש סקירה", () => {
    const res = runHook({ staged: [SRC, "tasks/BACKLOG.md"] });
    expect(res.status).toBe(2);
  });

  it("קוד + ארטיפקט נלווה (research.md) עדיין דורש סקירה", () => {
    const res = runHook({
      staged: [SRC, "tasks/done/DASHBOARD-PARENT-001/research.md"],
    });
    expect(res.status).toBe(2);
  });

  it("סימון-סקירה תקף פותח את השער", () => {
    const res = runHook({
      staged: [SRC, "tasks/active/ACCOUNTS-001/INSTRUCTIONS.md"],
      reviewed: true,
    });
    expect(res.status).toBe(0);
  });
});

/**
 * הרשומה, לא הקובץ-הריק (נוסף 2026-08-22).
 *
 * עד אז הסימון היה 0 bytes, ולכן **סקירה שמצאה 6 באגים ו-`touch`
 * היו זהים לחלוטין** לשער — הוא בדק קיום-קובץ, לא התרחשות-סקירה.
 * העקיפה נשארה בסמכות Marina (הכרעה 22.8), אבל היא חייבת לומר למה.
 */
describe("שער-הסקירה — הסימון חייב להיות רשומה", () => {
  const TASK = "tasks/active/ACCOUNTS-001/INSTRUCTIONS.md";

  it("סימון ריק (הצורה הישנה) נדחה", () => {
    const res = runHook({ staged: [SRC, TASK], markerBody: "" });
    expect(res.status).toBe(2);
    expect(res.output).toContain("אינו רשומה תקינה");
  });

  it("‏JSON פגום נדחה", () => {
    const res = runHook({ staged: [SRC, TASK], markerBody: "{not json" });
    expect(res.status).toBe(2);
    expect(res.output).toContain("אינו רשומה תקינה");
  });

  it("ויתור בלי סיבה נדחה", () => {
    const res = runHook({
      staged: [SRC, TASK],
      markerBody: JSON.stringify({ waived: true }),
    });
    expect(res.status).toBe(2);
    expect(res.output).toContain("בלי סיבה כתובה");
  });

  it("ויתור עם סיבה כתובה עובר", () => {
    const res = runHook({
      staged: [SRC, TASK],
      markerBody: JSON.stringify({ waived: true, reason: "תיעוד בלבד" }),
    });
    expect(res.status).toBe(0);
  });

  it("רשומת סקירה עם findings עוברת — כולל 0 ממצאים", () => {
    const res = runHook({
      staged: [SRC, TASK],
      markerBody: JSON.stringify({
        findings: 0,
        fixed: 0,
        waived: false,
        files: [SRC, TASK],
      }),
    });
    expect(res.status).toBe(0);
  });

  /**
   * 🔴 כיסוי לפי **רשימת-הקבצים**, לא לפי mtime (נוסף 2026-08-22
   * בעקבות סקירה עצמאית של תיקון-השער עצמו).
   *
   * mtime הוא אות סביבתי: קובץ חדש עם mtime ישן (מעבר-ענף,
   * `stash pop`) היה עובר בלי סקירה, וקובץ **שנמחק** לא נבדק כלל.
   */
  it("קובץ-קוד שאינו ברשומה נחסם, גם אם הסימון טרי", () => {
    const res = runHook({
      staged: [SRC, "src/lib/untouched.ts"],
      markerBody: JSON.stringify({ findings: 0, waived: false, files: [SRC] }),
    });
    expect(res.status).toBe(2);
    expect(res.output).toContain("src/lib/untouched.ts");
  });

  it("ויתור מכסה גם קבצים שאינם ברשומה", () => {
    const res = runHook({
      staged: [SRC, "src/lib/other.ts"],
      markerBody: JSON.stringify({ waived: true, reason: "חירום", files: [] }),
    });
    expect(res.status).toBe(0);
  });

  it("רשומה בלי findings נדחית", () => {
    const res = runHook({
      staged: [SRC, TASK],
      markerBody: JSON.stringify({ waived: false }),
    });
    expect(res.status).toBe(2);
  });
});

/**
 * קוד אינו רק `src/`. בדיקה שגויה מסוכנת כמו קוד שגוי — היא מכריזה
 * "ירוק" על מה שאינו. עד 22.8 `tests/`, `scripts/` ו**ההוק עצמו**
 * היו ניתנים לשינוי בלי סקירה.
 */
/**
 * 🔴 חילוץ הפקודה — הכשל-השקט הקלאסי (נוסף 2026-08-22).
 *
 * הצורה הקודמת הייתה `grep -o '"command"...' | head -1`, כלומר היא
 * תפסה את **המפתח הראשון בשם `command` בכל מקום בקלט** — לא את זה
 * שתחת `tool_input`. מטען שבו `"command"` מופיע קודם (למשל בתוך
 * `description`) היה מחזיר ערך אחר, והשער היה **נכבה בשקט**:
 * בלי הודעה, בלי קוד-שגיאה. בדיוק הכשל שההוק נולד למנוע.
 */
describe("שער-הסקירה — חילוץ הפקודה מהמטען", () => {
  function runRaw(payload: unknown, staged: string[]) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "emiva-hook-raw-"));
    tmpRoots.push(dir);
    execFileSync("git", ["init", "-q"], { cwd: dir });
    for (const rel of staged) {
      const abs = path.join(dir, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, "x\n");
    }
    execFileSync("git", ["add", "-f", ...staged], { cwd: dir });
    try {
      execFileSync("bash", [HOOK], {
        cwd: dir,
        input: JSON.stringify(payload),
        encoding: "utf8",
        env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
        timeout: 60_000,
      });
      return 0;
    } catch (e) {
      return (e as { status?: number }).status ?? 1;
    }
  }

  it("מטען עם 'command' מטעה לפני tool_input עדיין נחסם", () => {
    const status = runRaw(
      { description: { command: "ls" }, tool_input: { command: "git commit -m x" } },
      [SRC],
    );
    expect(status, "השער נכבה בשקט בגלל מפתח קודם בשם command").toBe(2);
  });

  it("פקודה שאינה git commit עוברת חופשי", () => {
    expect(runRaw({ tool_input: { command: "npm test" } }, [SRC])).toBe(0);
  });

  /**
   * 🔴 fail-closed כש-node אינו זמין (נמצא 2026-08-22 בהרצה הראשונה
   * של `emiva-reviewer`, הסוכן הייעודי).
   *
   * חילוץ-הפקודה עבר מ-grep לפרסור JSON — שיפור בדיוק, אבל הוא
   * הכניס **תלות בכלי חיצוני**. בלי node המשתנה יוצא ריק, מחרוזת
   * ריקה אינה מכילה "git commit", והשער היה **נעלם בשקט**. זהו
   * מצב-הכשל שההוק נולד למנוע, בגלגול הרביעי — והפעם הוא נכנס
   * דווקא דרך תיקון של אותו הוק.
   *
   * הכיוון הבטוח כשכלי חסר: **לחסום ולהסביר**, לא לוותר.
   */
  it("‏node שבור אינו מכבה את השער", () => {
    const fakeBin = fs.mkdtempSync(path.join(os.tmpdir(), "emiva-nonode-"));
    tmpRoots.push(fakeBin);
    const shim = path.join(fakeBin, "node");
    fs.writeFileSync(shim, "#!/bin/sh\nexit 127\n");
    fs.chmodSync(shim, 0o755);

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "emiva-hook-nonode-"));
    tmpRoots.push(dir);
    execFileSync("git", ["init", "-q"], { cwd: dir });
    const abs = path.join(dir, SRC);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, "x\n");
    execFileSync("git", ["add", "-f", SRC], { cwd: dir });

    let status = 0;
    try {
      execFileSync("bash", [HOOK], {
        cwd: dir,
        input: JSON.stringify({ tool_input: { command: "git commit -m x" } }),
        encoding: "utf8",
        env: { ...process.env, PATH: `${fakeBin}${path.delimiter}${process.env.PATH}`, CLAUDE_PROJECT_DIR: dir },
        timeout: 60_000,
      });
    } catch (e) {
      status = (e as { status?: number }).status ?? 1;
    }
    expect(status, "השער נעלם בשקט כש-node אינו זמין").toBe(2);
  });
});

/**
 * 🔴 שמות-קבצים לא-ASCII (נמצא 2026-08-22, `emiva-reviewer`).
 *
 * `core.quotePath` דלוק כברירת-מחדל, ולכן git מחזיר שם עברי **בתוך
 * מרכאות ובקידוד-octal**: `"src/lib/\327\236..."`. המרכאה הפותחת
 * שוברת את העוגן `^src/`, ה-grep מחזיר 0, והשער **נכבה בשקט על
 * הקומיט כולו** — לא רק על הקובץ העברי.
 *
 * בריפו שכל התיעוד בו בעברית ויש בו `src/content/hebrew/`, זו פצצה
 * מתוזמנת. הגלגול הרביעי של דפוס הכשל-השקט אחרי `^tasks/[A-Z]`.
 */
describe("שער-הסקירה — שמות לא-ASCII", () => {
  const HEB = "src/lib/מילון.ts";

  it("שם-קובץ עברי אינו מכבה את השער", () => {
    const res = runHook({ staged: [HEB] });
    expect(res.status, "שם עברי החליק מתחת לשער").toBe(2);
  });

  it("שם עברי מכוסה ברשומה עובר — הרשומה וההוק מסכימים על הצורה", () => {
    const res = runHook({
      staged: [HEB],
      markerBody: JSON.stringify({ findings: 0, waived: false, files: [HEB] }),
    });
    expect(res.status).toBe(0);
  });
});

describe("שער-הסקירה — היקף הקוד המוגן", () => {
  it.each([
    ["tests/unit/foo.test.ts", "בדיקות"],
    ["scripts/judge-content.mjs", "סקריפטים"],
    ["evals/backlog/x.eval.ts", "evals"],
    [".claude/hooks/require-review.sh", "השומר עצמו"],
  ])("%s דורש סקירה (%s)", (file) => {
    const res = runHook({ staged: [file] });
    expect(res.status).toBe(2);
  });

  it("תיעוד טהור עדיין עובר חופשי", () => {
    const res = runHook({ staged: ["CHANGELOG.md", "docs/adr/005-x.md"] });
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
