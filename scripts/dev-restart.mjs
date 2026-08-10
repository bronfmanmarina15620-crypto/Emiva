// BL-002 — הפעלה מחדש של שרת הפיתוח. **הפתרון הראשון כשהמסך נשבר.**
//
// מתי להשתמש: האפליקציה מציגה מסך שגיאה שמדבר על קבצים פנימיים של
// Next.js (`global-error.js`, `__webpack_modules__ is not a function`)
// אחרי שנוספו כמה קבצים בבת אחת או שהשתנה מבנה תיקיות.
//
// למה זה ולא ניקוי מטמון: שחזור מבוקר (2026-08-10) הראה שהתקלה היא
// **מצב בזיכרון של התהליך החי**, לא מטמון שנפגם על הדיסק —
//   · Turbopack נופל באותה שגיאה בדיוק, אז זה לא באג של webpack;
//   · השרת לא מתאושש גם אחרי הסרת הקבצים שגרמו לזה;
//   · הפעלה מחדש בלי לנקות כלום (136MB של .next נשארו) תיקנה הכל.
// מחיקת `.next` "עבדה" רק כי כפתה הפעלה מחדש. כאן עושים את הדבר
// עצמו — מהר יותר, ובלי לשלם על בנייה מחדש של כל המטמון.
//
// אם *גם* אחרי זה שבור — `npm run dev:clean` מנקה גם את המטמון.

import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = process.env.PORT ?? "3000";
const isWindows = process.platform === "win32";

/** מאתר תהליכי שרת-פיתוח חיים ועוצר אותם, כדי שהפורט יתפנה. */
function stopLiveDevServers() {
  if (!isWindows) {
    const out = spawnSync("bash", ["-lc", `lsof -ti tcp:${PORT} || true`], {
      encoding: "utf8",
    });
    const pids = (out.stdout ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
    for (const pid of pids) spawnSync("kill", ["-9", pid]);
    return pids.length;
  }

  // ב-Windows מזהים לפי שורת-הפקודה: רק תהליכי node שמריצים next dev.
  // חשוב לא לסגור את כל תהליכי node — VS Code ו-Claude רצים גם הם.
  //
  // האיתור יושב ב-`find-dev-servers.ps1` ולא כמחרוזת כאן: שאילתה
  // שעוברת דרך spawnSync ודרך Bash נשברת בשקט — `$_` מתפרש על ידי
  // המעטפת לפני ש-PowerShell רואה אותו. התוצאה בפועל (2026-08-10)
  // הייתה "לא נמצא שרת חי" בזמן שחמישה שרתים רצו וכתבו זה על זה.
  const finder = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "find-dev-servers.ps1",
  );
  const out = spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", finder],
    { encoding: "utf8" },
  );
  const pids = (out.stdout ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));

  // `taskkill /T` סוגר גם תהליכי-בן. `process.kill` לא מגיע אליהם
  // ב-Windows, ושרת יתום שנשאר ממשיך לכתוב ל-.next.
  for (const pid of pids) {
    spawnSync("taskkill", ["/PID", pid, "/F", "/T"], { encoding: "utf8" });
  }
  return pids.length;
}

const stopped = stopLiveDevServers();
console.log(
  stopped > 0
    ? `♻️  נסגרו ${stopped} שרתי-פיתוח שרצו. מפעיל מחדש...`
    : "♻️  לא נמצא שרת חי. מפעיל...",
);

// המטמון **לא** נמחק בכוונה — ההפעלה מחדש היא התיקון, והשמירה עליו
// חוסכת בנייה מחדש של הכל.
const child = spawn("npx", ["next", "dev", "--port", PORT], {
  stdio: "inherit",
  shell: true,
});
child.on("exit", (code) => process.exit(code ?? 0));
