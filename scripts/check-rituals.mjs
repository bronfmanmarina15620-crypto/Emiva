#!/usr/bin/env node
/**
 * BL-009 — בודק אם הטקסים הכתובים בפיגור. **קריאה בלבד.**
 *
 * הרקע: ADR-002 יצר סוכנים מתוזמנים שמייצרים טיוטות. הם רצו כסדרם
 * מ-2026-05-01 עד 2026-07-03, ואז **שתקו חמישה שבועות** (W28–W32)
 * בזמן שהריפו היה פעיל — 12 קומיטים ביולי. איש לא הבחין.
 *
 * למה זה נמשך שלושה חודשים בשקט: לא היה שום דבר שבודק את הפער.
 * ה-ADR עצמו אף חזה זאת תחת "נקודות עיוורות של cron" ודרש לבדוק
 * התנהגות הרצות-שפוספסו — בדיקה שלא בוצעה. יתרה מזו, 14 טיוטות
 * ישבו בענפים מרוחקים בזמן שכל בדיקה שנעשתה ספרה קבצים מקומיים,
 * ולכן דיווחה "לא רץ" על תהליך שרץ.
 *
 * הסקריפט הזה הופך את "מישהי תשים לב" לבדיקה שאפשר להריץ. הוא
 * **אינו** מייצר תוכן ואינו כותב דבר — הוא רק אומר מה חסר.
 *
 * הרצה: npm run rituals:check
 * קוד יציאה 1 כשיש פיגור, כדי שאפשר יהיה לחבר אותו ל-CI בעתיד.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// `fileURLToPath` ולא `new URL(...).pathname`: ב-Windows האחרון מחזיר
// נתיב שמתחיל בלוכסן ("/C:/Users/...") ו-spawnSync נכשל עליו בשקט.
// זה נתפס בהרצה הראשונה — הבדיקה דיווחה "אין רשת" בזמן שהרשת תקינה.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEVLOG_DIR = path.join(ROOT, "docs", "devlog");
const MILESTONE_DIR = path.join(ROOT, "docs", "milestones");

// `now` מוזרק כדי שהבדיקה תהיה דטרמיניסטית בטסטים. בלי זה כל טסט
// שנכתב עליה היה נשבר לבד עם חלוף הזמן — כלומר בדיקה עם תאריך-תפוגה.
const now = process.env.EMIVA_NOW ? new Date(process.env.EMIVA_NOW) : new Date();

/**
 * מספר השבוע לפי אותה הגדרה שבה משתמש הריפו: שבוע ראשון-שבת,
 * ו-W01 הוא השבוע שמכיל את 1 בינואר. ADR-002 §Schedule 1 קובע
 * ראשון-שבת במפורש, ולכן אסור להשתמש כאן ב-ISO week (שני-ראשון).
 */
export function weekNumber(date) {
  const jan1 = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const firstSunday = new Date(jan1);
  firstSunday.setUTCDate(jan1.getUTCDate() - jan1.getUTCDay());
  const diffDays = Math.floor((date - firstSunday) / 86_400_000);
  return Math.floor(diffDays / 7) + 1;
}

/**
 * כל תגי ה-YYYY-W## המכוסים — בקובץ ייעודי **או בסיכום מאחד**.
 *
 * סיכום-רטרו שמכסה טווח (`...W17-W33.md`) הוא כיסוי לכל דבר: הוא
 * נכתב בדיוק כדי להחליף 14 קריאות בקריאה אחת. בודק שמתעלם ממנו
 * מדווח פיגור על עבודה שכבר נעשתה, ובודק רועש הוא בודק שמתעלמים
 * ממנו — כלומר בדיוק הכשל שהוא נבנה למנוע.
 * *(נתפס 2026-08-12, שעה אחרי שנכתב: דיווח 🔴 על 8 שבועות
 * שכולם מכוסים ב-`2026-סיכום-רטרו-W17-W33.md`.)*
 */
function existingWeeknotes() {
  if (!fs.existsSync(DEVLOG_DIR)) return new Set();
  const out = new Set();

  for (const fn of fs.readdirSync(DEVLOG_DIR)) {
    const single = fn.match(/^(\d{4})-W(\d{2})\.md$/);
    if (single) {
      out.add(`${single[1]}-W${single[2]}`);
      continue;
    }

    // סיכום-טווח: `YYYY-<כל טקסט>-W##-W##.md`
    const range = fn.match(/^(\d{4})\D+W(\d{2})-W(\d{2})\.md$/);
    if (range) {
      const [, y, from, to] = range;
      for (let w = Number(from); w <= Number(to); w++) {
        out.add(`${y}-W${String(w).padStart(2, "0")}`);
      }
    }
  }
  return out;
}

/**
 * טיוטות שיושבות בענפים מרוחקים ולא מוזגו.
 *
 * זה הלקח המרכזי של BL-009: חוזה ה-output של ADR-002 שולח את
 * הטיוטה ל-branch, ולכן ספירת קבצים מקומיים דיווחה "0 טיוטות"
 * בזמן ש-14 חיכו. בדיקה שסופרת רק מקומית משחזרת בדיוק את הבאג.
 */
function unmergedDraftBranches() {
  const res = spawnSync("git", ["branch", "-r", "--no-color"], {
    encoding: "utf8",
    cwd: ROOT,
  });
  if (res.error || res.status !== 0) return { branches: [], checkFailed: true };

  const branches = (res.stdout ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => /^origin\/(devlog|milestone)s?\//.test(s));
  return { branches, checkFailed: false };
}

const findings = [];

// ── 1. יומנים שבועיים חסרים ─────────────────────────────────────
const notes = existingWeeknotes();
const year = now.getUTCFullYear();
const thisWeek = weekNumber(now);

// נבדקים 8 השבועות האחרונים בלבד. היסטוריה רחוקה יותר אינה
// "פיגור" אלא ארכיון — הפער של יולי כבר חולץ לסיכום רטרו ייעודי.
const LOOKBACK_WEEKS = 8;
const missing = [];
for (let w = Math.max(1, thisWeek - LOOKBACK_WEEKS); w < thisWeek; w++) {
  const tag = `${year}-W${String(w).padStart(2, "0")}`;
  if (!notes.has(tag)) missing.push(tag);
}
if (missing.length > 0) {
  findings.push({
    level: missing.length >= 3 ? "high" : "low",
    title: `${missing.length} יומנים שבועיים חסרים ב-8 השבועות האחרונים`,
    detail: missing.join(", "),
    action: "טיוטה נוצרת מ-git log של אותו שבוע. ראי CLAUDE.md §Flow טיוטת Weeknote.",
  });
}

// ── 2. תיקיית אבני-הדרך ─────────────────────────────────────────
if (!fs.existsSync(MILESTONE_DIR)) {
  findings.push({
    level: "high",
    title: "docs/milestones/ אינה קיימת",
    detail:
      "ADR-002 §Schedule 2 מגדיר סקירה חודשית, ו-3 סיכומים כבר הופקו בעבר — אך התיקייה מעולם לא נוצרה ב-main.",
    action: "או ליצור את התיקייה עם הסיכום הראשון, או לתעד ב-ADR-002 שהקצב החודשי בוטל.",
  });
}

// ── 3. טיוטות תלויות בענפים מרוחקים ─────────────────────────────
const { branches, checkFailed } = unmergedDraftBranches();
if (checkFailed) {
  findings.push({
    level: "low",
    title: "לא ניתן לבדוק ענפים מרוחקים",
    detail: "git branch -r נכשל — ייתכן שאין חיבור רשת.",
    action: "להריץ שוב כשיש רשת.",
  });
} else if (branches.length > 0) {
  findings.push({
    level: "high",
    title: `${branches.length} טיוטות ממתינות בענפים מרוחקים`,
    detail: branches.join(", "),
    action:
      "טיוטה שנוצרת ואיש לא קורא היא בדיוק הכשל של BL-009 — לקרוא, לחלץ ערך, ולמזג או למחוק.",
  });
}

// ── דיווח ────────────────────────────────────────────────────────
console.log(`🗓️  בדיקת קצב הטקסים — ${now.toISOString().slice(0, 10)}\n`);

if (findings.length === 0) {
  console.log("✅ הטקסים מעודכנים. אין פיגור.");
  process.exit(0);
}

for (const f of findings) {
  console.log(`${f.level === "high" ? "🔴" : "🟡"} ${f.title}`);
  console.log(`   ${f.detail}`);
  console.log(`   → ${f.action}\n`);
}

const high = findings.filter((f) => f.level === "high").length;
console.log(
  high > 0
    ? `נמצאו ${findings.length} ממצאים (${high} דורשים טיפול).`
    : `נמצאו ${findings.length} ממצאים.`,
);

process.exit(high > 0 ? 1 : 0);
