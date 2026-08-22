#!/usr/bin/env node
/**
 * בודק ש**כל** קובץ-קוד מקומט מכוסה על ידי רשומת-הסקירה.
 *
 * קלט: רשימת קבצים ב-stdin (שורה לכל קובץ) · נתיב הרשומה כ-argv[2].
 * פלט: הקבצים שאינם מכוסים, מופרדים ברווח. ריק = הכל מכוסה.
 *
 * למה זה קיים ולא נבדק ב-mtime:
 * mtime הוא **אות סביבתי**, לא עובדה על הסקירה. קובץ-קוד חדש עם
 * mtime ישן (מעבר-ענף, `stash pop`, patch שהוחל) היה עובר בלי
 * סקירה, וקובץ **שנמחק** לא נבדק כלל כי בדיקת-הקיום דילגה עליו.
 * הרשומה כבר שמרה את `files` — פשוט אף אחד לא קרא אותה.
 *
 * למה סקריפט נפרד ולא inline ב-bash: ניסיון לכתוב את זה בתוך
 * `node -e '...'` בהוק נשבר על בריחת-תווים — `\n` בתוך מחרוזת-JS
 * בתוך מחרוזת-bash קרס לשורה חדשה אמיתית והשתיק את הבדיקה
 * **בשקט**. בדיוק סוג הכשל שההוק נועד למנוע.
 */

import { readFileSync } from "node:fs";

const markerPath = process.argv[2];

let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  let rec;
  try {
    rec = JSON.parse(readFileSync(markerPath, "utf8"));
  } catch {
    // רשומה פגומה — הוולידציה הנפרדת כבר תפסה את זה.
    process.exit(0);
  }

  // ויתור מודע מכסה את הכל (בהכרעת Marina, 22.8).
  if (rec?.waived === true) process.exit(0);

  const reviewed = new Set(Array.isArray(rec?.files) ? rec.files : []);
  const missing = input
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((f) => !reviewed.has(f));

  if (missing.length > 0) console.log(missing.join(" "));
});
