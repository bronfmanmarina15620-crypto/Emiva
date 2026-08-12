// BL-002 — עוצר בנייה כששרת פיתוח חי רץ. **מירוץ-כתיבה על `.next`.**
//
// הרקע (2026-08-10): `npm run build` נכשל שלוש פעמים ברצף, כל פעם על
// עמוד אחר (`/journal/puppy`, `/404`, `/parent/history`), תמיד עם
// `Cannot find module for page`. נבדק שזה **לא** נגרם מהקוד: בנייה על
// HEAD נקי לגמרי נכשלה גם היא, ומיד אחר כך שלוש בניות רצופות עברו
// (3/3) בלי שום שינוי קוד.
//
// המשתנה היחיד שהבדיל: בכשלונות רצו במקביל שרתי-פיתוח שכתבו ל-`.next`.
// כלומר שני תהליכים כותבים לאותה תיקייה. המסקנה נרשמה ב-BACKLOG כ"לא
// מריצים build בזמן ששרת פיתוח חי" — אבל נשארה כפרוזה, ולכן לא הגנה
// על כלום. כאן היא הופכת לשער אמיתי.
//
// מעקף מפורש: `EMIVA_SKIP_BUILD_GUARD=1 npm run build`. הוא קיים כי
// זיהוי-תהליכים יכול לטעות, ושער שאי אפשר לעקוף הופך לחסם.

import { spawnSync } from "node:child_process";
import { findDevServerPids } from "./lib/find-dev-servers.mjs";

if (process.env.EMIVA_SKIP_BUILD_GUARD === "1") {
  console.log("⚠️  שומר-הבנייה דולג (EMIVA_SKIP_BUILD_GUARD=1).");
} else {
  const { pids, detectionFailed } = findDevServerPids();

  if (detectionFailed) {
    // איתור שנכשל אינו סיבה לחסום — רק להזהיר. שער שחוסם בגלל תקלה
    // בכלי שלו עצמו מאמן את המשתמשת לעקוף אותו תמיד.
    console.log("⚠️  לא הצלחתי לבדוק אם רץ שרת פיתוח. ממשיך לבנות.");
  } else if (pids.length > 0) {
    console.error(
      [
        "",
        `🚫 יש ${pids.length} שרת/י פיתוח שרצים כרגע (PID: ${pids.join(", ")}).`,
        "",
        "בנייה בזמן ששרת חי גורמת לשני תהליכים לכתוב לאותה תיקייה (.next),",
        "והבנייה נופלת על שגיאה מבלבלת שנראית כמו באג בקוד — אבל אינה.",
        "",
        "מה לעשות: לסגור את שרת הפיתוח, ואז לבנות שוב.",
        "",
        "לעקוף בכוונה:  EMIVA_SKIP_BUILD_GUARD=1 npm run build",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }
}

// השער עבר — מריצים את הבנייה עצמה.
const result = spawnSync("npx", ["next", "build"], {
  stdio: "inherit",
  shell: true,
});
process.exit(result.status ?? 0);
