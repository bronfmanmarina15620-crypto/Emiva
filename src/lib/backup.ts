/**
 * גיבוי ושחזור — רשת ביטחון עד שיהיה שרת (LAUNCH-PUBLIC-001 D3).
 *
 * כל מצב Emiva יושב ב-`localStorage` של דפדפן אחד. ניקוי היסטוריה,
 * מעבר למחשב אחר או מחיקה בטעות = כל ההתקדמות נעלמת בלי אזהרה ובלי
 * שחזור. לתת קישור לאנשים בלי רשת ביטחון = להבטיח להם אובדן מידע.
 *
 * המודול טהור וניתן להזרקה (`storage?`) כדי שייבדק בלי דפדפן.
 * הצורה כאן היא גם **כלי ההעברה** ל-`ACCOUNTS-001` P5, כשההיסטוריה
 * של הבנות תעבור לשרת.
 */

const BACKUP_VERSION = 1;

/** התחילית שכל מפתחות Emiva חולקים. מגדירה מה שייך לגיבוי. */
const EMIVA_PREFIX = "emiva.";

export type BackupFile = {
  /** מזהה-פורמט, כדי שקובץ זר לא ייובא בטעות. */
  format: "emiva.backup";
  version: number;
  /** ms epoch — מוזרק בבדיקות. */
  createdAt: number;
  data: Record<string, string>;
};

type StorageLike = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem" | "key" | "length"
>;

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function emivaKeys(ls: StorageLike): string[] {
  const keys: string[] = [];
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (k && k.startsWith(EMIVA_PREFIX)) keys.push(k);
  }
  return keys;
}

/**
 * אוסף את כל מצב Emiva לאובייקט אחד.
 *
 * **סורק לפי תחילית ולא לפי רשימה** במכוון: רשימה ידנית מתיישנת בשקט
 * בדיוק כמו זו שהשאירה שלושה מפתחות יתומים במחיקת פרופיל. מפתח חדש
 * ייכנס לגיבוי לבד.
 *
 * ⚠️ **כולל את קוד ה-PIN המוצפן של ההורה.** זה מכוון — שחזור שמשאיר
 * את ההורה נעולה מחוץ לדשבורד אינו שחזור.
 */
export function createBackup(
  now: number = Date.now(),
  storage?: StorageLike,
): BackupFile | null {
  const ls = resolveStorage(storage);
  if (!ls) return null;
  const data: Record<string, string> = {};
  for (const k of emivaKeys(ls)) {
    const v = ls.getItem(k);
    if (v !== null) data[k] = v;
  }
  return {
    format: "emiva.backup",
    version: BACKUP_VERSION,
    createdAt: now,
    data,
  };
}

export type RestoreResult =
  | { ok: true; keysRestored: number }
  | { ok: false; reason: "unreadable" | "wrong_format" | "future_version" };

/**
 * מוודא שהקובץ הוא גיבוי Emiva תקין לפני שנוגעים במידע קיים.
 *
 * גיבוי פגום שנטען חלקית גרוע מגיבוי שנדחה: ההורה חושבת ששחזרה,
 * וההתקדמות האמיתית כבר נמחקה.
 */
export function parseBackup(raw: string): BackupFile | RestoreResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as BackupFile).format !== "emiva.backup" ||
    typeof (parsed as BackupFile).data !== "object" ||
    (parsed as BackupFile).data === null
  ) {
    return { ok: false, reason: "wrong_format" };
  }
  const file = parsed as BackupFile;
  if (typeof file.version !== "number" || file.version > BACKUP_VERSION) {
    return { ok: false, reason: "future_version" };
  }
  return file;
}

/**
 * משחזר גיבוי — **מחליף** את כל מצב Emiva הקיים.
 *
 * מנקה קודם את מפתחות Emiva הקיימים, אחרת פרופיל שנמחק אחרי הגיבוי
 * היה "קם לתחייה" חלקית ומשאיר מצב מעורבב משני עולמות. מפתחות שאינם
 * של Emiva לא נוגעים בהם.
 */
export function restoreBackup(
  raw: string,
  storage?: StorageLike,
): RestoreResult {
  const ls = resolveStorage(storage);
  if (!ls) return { ok: false, reason: "unreadable" };

  const parsed = parseBackup(raw);
  if ("ok" in parsed) return parsed;

  for (const k of emivaKeys(ls)) ls.removeItem(k);

  let count = 0;
  for (const [k, v] of Object.entries(parsed.data)) {
    // מתעלמים ממפתחות זרים גם אם הוברחו לקובץ.
    if (!k.startsWith(EMIVA_PREFIX)) continue;
    if (typeof v !== "string") continue;
    ls.setItem(k, v);
    count += 1;
  }
  return { ok: true, keysRestored: count };
}

/** שם קובץ יציב וקריא: `emiva-backup-2026-08-12.json`. */
export function backupFileName(now: number = Date.now()): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `emiva-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}.json`;
}
