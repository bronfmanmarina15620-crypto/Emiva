// LAUNCH-PUBLIC-001 D4 — מכין את עץ-העבודה להעלאה ציבורית.
//
// הרקע: `vercel` מעלה את **קובצי-העבודה**, לא את מה שקומט. אם מחוברת
// מקומית חבילת-חזרה פרטית (`private/index.ts` שמייבא JSON), החיווט
// נשלח לשרת בלי ה-JSON — כי ה-JSON מוחרג ב-`.vercelignore` — והבנייה
// נופלת על `Module not found`. זה קרה בהעלאה הראשונה.
//
// זו גם ההוכחה שהמנגנון עובד: התוכן הפרטי באמת לא עוזב את המחשב.
//
// הסקריפט מחזיר את הברל לגרסה **שבגיט** (הריקה) לפני העלאה, ושומר
// עותק של הגרסה המקומית כדי שאפשר יהיה להחזיר אותה אחר כך עם
// `npm run deploy:restore`.

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, writeFileSync } from "node:fs";

const BARREL = "src/content/review-packs/private/index.ts";
const BACKUP = "src/content/review-packs/private/.index.local.bak";

const mode = process.argv[2] === "restore" ? "restore" : "prep";

if (mode === "restore") {
  if (!existsSync(BACKUP)) {
    console.log("ℹ️  אין גיבוי מקומי להחזיר. לא נעשה כלום.");
    process.exit(0);
  }
  copyFileSync(BACKUP, BARREL);
  console.log("✅ החיווט המקומי של החבילות הפרטיות הוחזר.");
  process.exit(0);
}

let tracked;
try {
  tracked = execFileSync("git", ["show", `HEAD:${BARREL}`], {
    encoding: "utf8",
  });
} catch {
  console.log("⚠️  לא הצלחתי לקרוא את הגרסה שבגיט. ממשיך בלי לשנות.");
  process.exit(0);
}

const current = existsSync(BARREL)
  ? execFileSync("node", ["-e", `process.stdout.write(require('fs').readFileSync(${JSON.stringify(BARREL)},'utf8'))`], { encoding: "utf8" })
  : "";

if (current === tracked) {
  console.log("✅ הברל כבר במצב ציבורי (ריק). אפשר להעלות.");
  process.exit(0);
}

copyFileSync(BARREL, BACKUP);
writeFileSync(BARREL, tracked, "utf8");
console.log(
  [
    "✅ הברל הוחזר לגרסה הציבורית (ריקה) לקראת העלאה.",
    `   הגרסה המקומית נשמרה ב-${BACKUP}.`,
    "   להחזרה אחרי ההעלאה:  npm run deploy:restore",
  ].join("\n"),
);
