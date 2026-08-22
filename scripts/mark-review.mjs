#!/usr/bin/env node
/**
 * כותב את רשומת-הסקירה (`.claude/.review-done`).
 *
 * שימוש:
 *   node scripts/mark-review.mjs --findings 7 --fixed 7
 *   node scripts/mark-review.mjs --waive "תיקון-תיעוד בלבד, אין קוד"
 *
 * למה זה קיים: עד 22.8 הדרך היחידה לספק את השער הייתה
 * `touch .claude/.review-done` — **אותה פקודה בדיוק** ששימשה
 * כעקיפה מודעת. כלומר לא הייתה דרך להבחין בין השתיים, ולא היה
 * מקום לרשום מה הסקירה מצאה. עכשיו יש דרך אחת מתועדת לכל אחת.
 *
 * הרשומה נשמרת ב-`.claude/.review-done` והיא **gitignored** — היא
 * מקומית לכל clone, כמו שהייתה. התיעוד המתמשך של ממצאים חי
 * ב-CHANGELOG, לא כאן.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";

/**
 * מעוגן לשורש-הריפו, לא ל-cwd — אחרת הרצה מתת-תיקייה כותבת סימון
 * במקום הלא-נכון, וההוק לא ימצא אותו.
 */
const REPO_ROOT = (() => {
  try {
    return execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
  } catch {
    return process.cwd();
  }
})();
const MARKER = join(REPO_ROOT, ".claude", ".review-done");

/**
 * ערך של דגל. מחזיר `""` כשהדגל ניתן בלי ערך — כדי שאפשר יהיה
 * להבחין בין "לא ניתן" (null) ל"ניתן ריק" (""), אחרת הבדיקה של
 * ויתור-ריק הופכת לקוד מת.
 */
function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return null;
  const next = process.argv[i + 1];
  // דגל אחר אינו ערך: `--findings --fixed 3` אינו findings="--fixed".
  if (next === undefined || next.startsWith("--")) return "";
  return next;
}

const waiveReason = arg("waive");
const findings = arg("findings");
const fixed = arg("fixed");

// ויתור ריק — נבדק **לפני** בדיקת-השימוש, אחרת "" נופל לענף
// הכללי וההודעה הייעודית הופכת לקוד מת.
if (waiveReason !== null && waiveReason.trim() === "") {
  console.error("ויתור חייב סיבה כתובה. ריק אינו סיבה.");
  process.exit(1);
}

if (waiveReason === null && (findings === null || findings === "")) {
  console.error(
    "שימוש:\n" +
      "  node scripts/mark-review.mjs --findings <N> [--fixed <N>]\n" +
      '  node scripts/mark-review.mjs --waive "<סיבה>"\n\n' +
      "‏--findings 0 הוא ערך תקין (סקירה שלא מצאה כלום).",
  );
  process.exit(1);
}

if (waiveReason === null) {
  for (const [flag, val] of [["findings", findings], ["fixed", fixed]]) {
    if (val === null) continue;
    if (!Number.isFinite(Number(val))) {
      console.error(`--${flag} חייב להיות מספר. התקבל: "${val}"`);
      process.exit(1);
    }
  }
}

let sha = "unknown";
let files = [];
try {
  sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  files = execSync("git diff --cached --name-only", { encoding: "utf8" })
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
} catch {
  // ריפו חדש בלי HEAD, או git חסר — לא סיבה להפיל את הסימון.
}

const record = waiveReason
  ? { at: new Date().toISOString(), sha, files, waived: true, reason: waiveReason.trim() }
  : {
      at: new Date().toISOString(),
      sha,
      files,
      findings: Number(findings),
      fixed: fixed === null ? Number(findings) : Number(fixed),
      waived: false,
      reason: null,
    };

writeFileSync(MARKER, JSON.stringify(record, null, 2) + "\n");

console.log(
  waiveReason
    ? `⚠️  ויתור נרשם: ${waiveReason.trim()}`
    : `✅ סקירה נרשמה: ${record.findings} ממצאים, ${record.fixed} תוקנו.`,
);
