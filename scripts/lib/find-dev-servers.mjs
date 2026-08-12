// BL-002 — איתור שרתי-פיתוח חיים. **מקור אחד לשלושה צרכנים.**
//
// שלושה מקומות צריכים לדעת "האם רץ עכשיו שרת פיתוח": `dev-restart`
// (כדי לסגור), `guard-build` (כדי לעצור בנייה מתנגשת) ו-`dev-status`
// (כדי להראות). בלי המודול הזה כל אחד היה מגלגל איתור משלו — ולוגיקת
// איתור משוכפלת נשברת בשקט באחד העותקים בדיוק כמו שקרה ב-2026-08-10.

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const isWindows = process.platform === "win32";

/** הנתיב ל-`find-dev-servers.ps1`, שיושב בתיקיית `scripts/` שמעל. */
function finderScript() {
  return path.join(
    path.dirname(path.dirname(fileURLToPath(import.meta.url))),
    "find-dev-servers.ps1",
  );
}

/**
 * מחזיר את ה-PIDs של שרתי-פיתוח חיים.
 *
 * מחזיר מערך ריק גם כשהאיתור עצמו נכשל — זו החלטה מכוונת: הצרכנים
 * מתייחסים ל"לא נמצא" כ"אפשר להמשיך", ועדיף לפספס אזהרה מאשר לחסום
 * בנייה בגלל כלי-איתור שנפל. `detectionFailed` מבדיל בין השניים.
 */
export function findDevServerPids() {
  if (!isWindows) {
    const port = process.env.PORT ?? "3000";
    const out = spawnSync("bash", ["-lc", `lsof -ti tcp:${port} || true`], {
      encoding: "utf8",
    });
    if (out.error) return { pids: [], detectionFailed: true };
    const pids = (out.stdout ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => /^\d+$/.test(s));
    return { pids, detectionFailed: false };
  }

  const out = spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", finderScript()],
    { encoding: "utf8" },
  );
  if (out.error) return { pids: [], detectionFailed: true };

  const pids = (out.stdout ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));
  return { pids, detectionFailed: false };
}
