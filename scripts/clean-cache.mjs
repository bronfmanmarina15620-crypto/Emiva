// BL-002 — ניקוי מטמון הבנייה של Next.js לפני הפעלת שרת הפיתוח.
//
// הרקע: מטמון webpack נשבר שוב ושוב אחרי הוספה של כמה קבצים בבת אחת
// או שינוי מבנה תיקיות בזמן שהשרת חי. השגיאות מצביעות על קבצים
// פנימיים של Next.js (`global-error.js`, `__webpack_modules__ is not
// a function`) ולא על קוד הפרויקט, ולכן קל לבזבז עליהן זמן חיפוש.
//
// ב-2026-08-10 זה קרה שלוש פעמים ביום אחד — אחת מהן בדיוק כשMarina
// ניסתה לשבת עם אווה. הפתרון ידוע ולוקח שניות; הסקריפט הזה רק הופך
// אותו לפקודה אחת (`npm run dev:clean`) במקום רצף ידני.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = path.join(root, ".next");

if (fs.existsSync(cacheDir)) {
  fs.rmSync(cacheDir, { recursive: true, force: true });
  console.log("🧹 מטמון הבנייה נוקה (.next)");
} else {
  console.log("🧹 אין מטמון לנקות");
}
