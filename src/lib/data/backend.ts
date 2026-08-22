/**
 * שכבת-הגישה לנתונים — **הממשק**, לא המימוש.
 *
 * ACCOUNTS-001 · P1. הממשק נולד **async מהיום הראשון**, בזמן
 * ש-`localStorage` עדיין מאחוריו ועונה מיד. הסיבה: המעבר לשרת
 * (P2) מחליף רק את המימוש כאן, בלי לעבור שוב על 89 אתרי-הקריאה
 * ועל 28 קובצי-הבדיקה. הפיצול ההפוך — שכבה סינכרונית ואז שכתוב —
 * היה עולה פעמיים.
 *
 * **המימוש מוזרק** (אותו דפוס כמו `StorageLike` ב-`backup.ts`),
 * כדי ששלושה דברים יהיו אפשריים בלי לגעת בקוראים:
 *   1. P2 מחליף ל-Supabase.
 *   2. הבדיקות מזריקות מימוש **איטי** ותופסות מרוצי-לחיצה —
 *      אי אפשר לתפוס לחיצה כפולה מול אחסון שעונה מיד.
 *   3. רינדור בשרת מקבל מימוש ריק במקום `typeof window` מפוזר.
 */

/** מפתח→ערך גולמי. במכוון צר: זה כל מה ש-`localStorage` נותן. */
export type DataBackend = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  /**
   * כל המפתחות בתחילית נתונה.
   *
   * קיים כי `localStorage` מאפשר סריקה של מרחב-המפתחות ולשרת **אין
   * מקבילה** — מי שסורק חייב לעבור דרך כאן, אחרת P2 יגלה את זה
   * בדרך הקשה. שני הסורקים היום: `storage.ts:87` ו-`backup.ts:39`.
   */
  keys(prefix: string): Promise<string[]>;
};

/** מימוש מעל `localStorage`. עונה מיד — ה-Promise נפתר באותו tick. */
export function localBackend(storage: Storage): DataBackend {
  return {
    async get(key) {
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    async set(key, value) {
      storage.setItem(key, value);
    },
    async remove(key) {
      storage.removeItem(key);
    },
    async keys(prefix) {
      const out: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith(prefix)) out.push(k);
      }
      return out;
    },
  };
}

/**
 * מימוש-אַיִן לרינדור בשרת: קריאה מחזירה ריק, כתיבה נבלעת.
 *
 * מחליף את `if (typeof window === "undefined") return ...` שחוזר
 * היום ב-24 פונקציות — הבדיקה עוברת למקום אחד.
 */
export function nullBackend(): DataBackend {
  return {
    async get() {
      return null;
    },
    async set() {},
    async remove() {},
    async keys() {
      return [];
    },
  };
}

let active: DataBackend | null = null;

/** ה-backend הפעיל. בדפדפן — `localStorage`; בשרת — אַיִן. */
export function getBackend(): DataBackend {
  if (active) return active;
  active =
    typeof window === "undefined"
      ? nullBackend()
      : localBackend(window.localStorage);
  return active;
}

/** מחליף מימוש. P2 יקרא לזה; הבדיקות קוראות לזה כדי להזריק איטיות. */
export function setBackend(backend: DataBackend | null): void {
  active = backend;
}
