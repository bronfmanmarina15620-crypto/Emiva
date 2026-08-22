#!/usr/bin/env node
/**
 * אימות רשומת-הסקירה (`.claude/.review-done`).
 *
 * נקרא מ-`.claude/hooks/require-review.sh`. מדפיס מילה אחת ל-stdout:
 *   OK                — רשומה תקינה
 *   BAD_MARKER        — JSON פגום, ריק, או חסרי-שדות
 *   WAIVED_NO_REASON  — ויתור מסומן בלי סיבה כתובה
 *
 * למה סקריפט ולא בדיקה ב-bash: אין `jq` על המכונה הזו, ופרסור JSON
 * ב-grep הוא בדיוק סוג הפתרון-השברירי שכבר הפיל את השער פעם אחת
 * (הרגרסיה של `^tasks/[A-Z]`, 22.8). `node` קיים ממילא.
 *
 * 🔴 מה זה **לא** עושה: זה לא מוכיח שסקירה באמת רצה. סוכן שרוצה
 * לרמות יכול לכתוב רשומה שקרית. המטרה צנועה יותר ומכוונת:
 * להפוך "עקפתי" ל**מעשה מפורש שמשאיר עקבות**, במקום `touch` אילם
 * שנראה זהה לסקירה אמיתית. (הכרעת Marina 22.8: העקיפה נשארת,
 * אבל דורשת סיבה.)
 */

import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) {
  console.log("BAD_MARKER");
  process.exit(0);
}

let raw;
try {
  raw = readFileSync(path, "utf8").trim();
} catch {
  console.log("BAD_MARKER");
  process.exit(0);
}

// קובץ ריק = הסימון הישן (0 bytes). זה בדיוק מה שהשינוי בא לפסול.
if (raw === "") {
  console.log("BAD_MARKER");
  process.exit(0);
}

let rec;
try {
  rec = JSON.parse(raw);
} catch {
  console.log("BAD_MARKER");
  process.exit(0);
}

if (typeof rec !== "object" || rec === null || Array.isArray(rec)) {
  console.log("BAD_MARKER");
  process.exit(0);
}

// ויתור מודע — מותר, אבל חייב לומר למה.
if (rec.waived === true) {
  const reason = typeof rec.reason === "string" ? rec.reason.trim() : "";
  console.log(reason.length > 0 ? "OK" : "WAIVED_NO_REASON");
  process.exit(0);
}

// סקירה אמיתית — חייבת לדווח כמה ממצאים היו (0 הוא ערך תקין).
if (typeof rec.findings !== "number" || !Number.isFinite(rec.findings)) {
  console.log("BAD_MARKER");
  process.exit(0);
}

console.log("OK");
