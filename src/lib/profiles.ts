import type { Difficulty, Skill } from "./types";
import { purgeProfileStorage } from "./storage";
import { clearTelemetry } from "./telemetry";

export type Profile = {
  id: string;
  name: string;
  age: number;
  // ISO YYYY-MM-DD. כשקיים — הגיל נגזר ממנו בכל טעינה, כך שיום-הולדת
  // מקדם את הבת לתכנית הגיל הבא בלי עדכון ידני (postmortem 2026-07-19:
  // גיל קפוא השאיר את אמיליה על נושאים של בת 7).
  birthDate?: string;
  allowedSkills: Skill[];
  createdAt: number;
  // Marina 2026-08-01: כיוון-קושי. הרמה מחושבת מחדש אחרי כל שאלה
  // לפי אחוז ההצלחה, ולכן הורדה חד-פעמית נמחקת תוך סשן. הערך הזה נשמר
  // בפרופיל ומופחת מהרמה המחושבת בכל פעם, כך שההורדה מחזיקה.
  // רלוונטי כשההורה עוזרת לילד/ה: ההצלחות נרשמות כשלו/ה, הציון מנופח,
  // והמערכת מסיקה רמה גבוהה מדי.
  //
  // **BL-021 (2026-08-14): מפורש פר-פרופיל, לעולם לא נגזר מגיל.**
  // עד היום הערך נזרע אוטומטית ל-1 לכל פרופיל בגיל 7–8 — כיול שנכתב
  // עבור ילדה אחת והפך לברירת-מחדל גלובלית כשהאתר נפתח לציבור. חסר
  // (או 0) פירושו "בלי הורדה", והוא נקבע רק מבחירה מפורשת במסך
  // עריכת הפרופיל.
  difficultyOffset?: number;
  // CORE-ENGLISH-PHONICS-001: מהירות ההקראה באנגלית, בשליטת הבת.
  // רעיון של Marina (2026-08-10) — כל בת מווסתת את הקצב שנוח לה
  // במקום ערך אחיד שנקבע מראש. נשמר פר-פרופיל.
  speechRate?: number;
  // GENDER-INCLUSIVE-001: באיזו לשון פונים לילד/ה.
  //
  // **שאלת לשון, לא שאלת מין** — כך ממליץ התקן הממשלתי, וכך גם
  // מנוסחת השאלה במסך. בעברית אין גוף שני ניטרלי, ולכן פנייה ישירה
  // חייבת להכריע; מה שאפשר לנסח בלי מגדר מנוסח כך ואינו נשען על
  // השדה הזה.
  //
  // **חסר = לא נבחר** → נופלים לנוסח הניטרלי ביותר שיש. פרופילים
  // שנוצרו לפני השדה ממשיכים לעבוד בלי לגעת בהם, ואף אחת לא נדרשת
  // למלא כלום (אותה קונבנציה כמו `speechRate`).
  addressForm?: AddressForm;
  // BL-017: נקודת-הפתיחה — שאלה אחת להורה בהרשמה.
  //
  // **דרגה אחת לכל המיומנויות** (הכרעת Marina 2026-08-14): הורה יודע
  // לומר "כבר מכיר/ה את זה" באופן כללי, לא נושא-נושא.
  //
  // **חסר = דילגו על השאלה** ⇒ מתחילים בדרגה 1 כמו קודם. אותה
  // קונבנציה כמו `addressForm`. חשוב שדילוג יישאר חסר ולא ייכתב כ-1:
  // אחרת אי-אפשר להבחין בטלמטריה בין "ענו: מההתחלה" ל"דילגו".
  //
  // **תוקף מוגבל בכוונה:** הערך משפיע רק עד שהדרגה במיומנות נמדדה
  // בפועל (כלומר זזה מ-1). מרגע זה `nextLevel` הוא הבעלים הבלעדי
  // של הדרגה, לתמיד. ראי `hasRealData` ב-`adaptive.ts`.
  startingLevel?: Difficulty;
};

/**
 * `feminine` / `masculine` — פנייה מלאה בלשון המתאימה.
 * `neutral` — "לא רוצה לומר" ⇒ נוסח שנמנע ממגדר גם במחיר חום מסוים.
 */
export type AddressForm = "feminine" | "masculine" | "neutral";

export const ADDRESS_FORM_DEFAULT: AddressForm = "neutral";

export function addressFormOf(profile?: Profile | null): AddressForm {
  return profile?.addressForm ?? ADDRESS_FORM_DEFAULT;
}

const BIRTH_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function ageFromBirthDate(
  birthDate: string,
  now: Date = new Date(),
): number | null {
  const m = BIRTH_DATE_RE.exec(birthDate);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const b = new Date(y, mo - 1, d);
  if (b.getFullYear() !== y || b.getMonth() !== mo - 1 || b.getDate() !== d) {
    return null;
  }
  let age = now.getFullYear() - y;
  const hadBirthdayThisYear =
    now.getMonth() > mo - 1 ||
    (now.getMonth() === mo - 1 && now.getDate() >= d);
  if (!hadBirthdayThisYear) age -= 1;
  if (age < 0 || age > 120) return null;
  return age;
}

const PROFILES_KEY = "emiva.profiles.v1";
const ACTIVE_KEY = "emiva.active_profile.v1";

export function allowedSkillsForAge(age: number): Skill[] {
  if (age >= 7 && age <= 8) {
    return [
      "add_sub_100",
      "multiplication",
      "hebrew_comprehension",
      // CORE-ENGLISH-PHONICS-001 — פוניקה **לפני** אוצר מילים.
      // MyLevel §3.3 דורש "Phonics מפורש (שיטתי)"; CORE-ENGLISH-001
      // דילגה עליו והתוצאה הייתה שאווה לא הצליחה לקרוא כלום
      // (Marina, 2026-08-10). קודם לומדים לקרוא, אחר כך מילים.
      "english_phonics",
      "english_vocab",
    ];
  }
  if (age >= 9 && age <= 10) {
    // hebrew_comprehension אחרי mult_2digit — לפי CORE-HEBREW-EMILIA-001
    // (מאושר 2026-05-31); הבנק הייעודי לבת 9 נבחר ב-bankForSkill לפי גיל.
    return [
      "fractions_intro",
      "ops_1000",
      "long_division",
      "bar_models",
      "mult_2digit",
      "hebrew_comprehension",
      // CORE-ENGLISH-PHONICS-002 — גם אמיליה עוברת פוניקה לפני אוצר
      // מילים. היא מכירה ABC וקוראת מילים חלקית, ולכן המאגר שלה
      // מתחיל מהברות ולא מאותיות (נבחר ב-bankForSkill לפי גיל).
      "english_phonics",
      "english_vocab",
    ];
  }
  return [];
}

// MyLevel §3.1: 7→10–12 דק', 9→15 דק'. Marina chose upper-bound + 3 items
// (2026-04-27). Mapping is items, not minutes — the +3 is intentional buffer
// over MyLevel's time targets, set by parent.
// 9–10 הורד ל-13 לבקשת Marina (2026-07-26).
export function itemsPerSessionForAge(age: number): number {
  if (age >= 7 && age <= 8) return 15;
  if (age >= 9 && age <= 10) return 13;
  return 10;
}

export function newProfileId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * BL-021 (2026-08-14) — כיוון-הקושי נקבע כאן בלבד.
 *
 * עד היום הערך נזרע אוטומטית בטעינה לכל פרופיל בגיל 7–8. הזריעה
 * נולדה נכון — אוולין הצליחה רק אחרי שמרינה הסבירה לה, ולכן הציון
 * שלה היה מנופח — אבל היא הותנתה על **גיל** כדי לא לפספס אותה,
 * וכך כיול של ילדה אחת הפך לברירת-מחדל של כל ילד בטווח. ברגע
 * שהאתר נפתח לציבור, כל ילד חיצוני בן 7–8 התחיל דרגה מתחת לציון
 * שלו — בלי סיבה שקשורה אליו.
 *
 * מהיום אין זריעה כלל: הערך מגיע רק מבחירה מפורשת של ההורה במסך
 * עריכת הפרופיל, ולכן `setDifficultyOffset` הוא נתיב-הכתיבה היחיד.
 */
export function setDifficultyOffset(profileId: string, offset: number): void {
  const all = loadProfiles();
  saveProfiles(
    all.map((p) => (p.id === profileId ? { ...p, difficultyOffset: offset } : p)),
  );
}

/**
 * CORE-ENGLISH-PHONICS-001 — שמירת מהירות ההקראה שהבת בחרה.
 *
 * אין כאן זריעה אוטומטית: ערך חסר פירושו "עוד לא בחרה", והקורא נופל
 * לברירת-המחדל. כך בחירה מפורשת של הבת לעולם לא נדרסת בטעינה הבאה.
 * (עד BL-021 היה כאן ניגוד ל-`difficultyOffset` — הוא בוטל כשהזריעה
 * לפי גיל הוסרה, ומאז כל השדות פר-הפרופיל נוהגים אותו דבר.)
 */
export function setSpeechRate(profileId: string, rate: number): void {
  const all = loadProfiles();
  saveProfiles(
    all.map((p) => (p.id === profileId ? { ...p, speechRate: rate } : p)),
  );
}

/**
 * GENDER-INCLUSIVE-001 — שמירת לשון הפנייה.
 *
 * כמו `setSpeechRate`: אין זריעה אוטומטית. ערך חסר פירושו "לא נבחר",
 * והקורא נופל לנוסח הניטרלי.
 */
export function setAddressForm(profileId: string, form: AddressForm): void {
  const all = loadProfiles();
  saveProfiles(
    all.map((p) => (p.id === profileId ? { ...p, addressForm: form } : p)),
  );
}

export function loadProfiles(): Profile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PROFILES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Profile[];
    if (!Array.isArray(arr)) return [];
    // Re-derive age from birthDate (when present) and allowedSkills from age
    // on every read, so birthdays and curriculum changes propagate to existing
    // profiles without a separate migration step.
    // BL-021: הטעינה **אינה נוגעת** ב-difficultyOffset. עד 2026-08-14
    // ישב כאן סעיף שזרע את הערך לפי גיל, והתנאי שלו כלל גם
    // `=== 0` — כלומר בחירה מפורשת של "רגיל" נדרסה בחזרה ל-1 בטעינה
    // הבאה. גם אחרי הסרת הזריעה, השארת הסעיף הייתה הופכת את המסך
    // החדש לחסר-משמעות.
    return arr.map((p) => {
      const derived =
        p.birthDate !== undefined ? ageFromBirthDate(p.birthDate) : null;
      const age = derived ?? p.age;
      return { ...p, age, allowedSkills: allowedSkillsForAge(age) };
    });
  } catch {
    return [];
  }
}

export function saveProfiles(profiles: Profile[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function createProfile(
  name: string,
  age: number,
  birthDate?: string,
  addressForm?: AddressForm,
  startingLevel?: Difficulty,
): Profile {
  const profile: Profile = {
    id: newProfileId(),
    name: name.trim(),
    age,
    ...(birthDate !== undefined ? { birthDate } : {}),
    // נשמר רק כשנבחר במפורש — חסר פירושו "לא נבחר" (ראי §AddressForm).
    ...(addressForm !== undefined ? { addressForm } : {}),
    // BL-021: כל פרופיל חדש נפתח בלי הורדת-קושי, בכל גיל. בניגוד
    // ל-addressForm כאן אין משמעות ל"לא נבחר" — חסר ו-0 מתנהגים זהה
    // אצל כל הקוראים (`?? 0`), ולכן זו כתיבה מפורשת לשם בהירות בלבד.
    //
    // **לא** להסיק מהשדה "נקבע מול נזרע": פרופילים ותיקים ומשוחזרים
    // נשארים `undefined`, ולכן ההבחנה הזו אינה תקפה בנתונים (נמצא
    // בסקירת-קוד). מיגרציה שתרצה להבחין ביניהם — ראי BL-023.
    difficultyOffset: 0,
    // BL-017: **רק אם נבחר** — בניגוד ל-difficultyOffset שלמעלה.
    // שם חסר ו-0 מתנהגים זהה ולכן אין משמעות ל"לא ענו"; כאן יש,
    // והמדידה שמרינה ביקשה תלויה בהבחנה בין דילוג לבין "מההתחלה".
    ...(startingLevel !== undefined ? { startingLevel } : {}),
    allowedSkills: allowedSkillsForAge(age),
    createdAt: Date.now(),
  };
  const all = loadProfiles();
  saveProfiles([...all, profile]);
  return profile;
}

/**
 * עדכון פרופיל קיים ללא איבוד היסטוריה: ה-id לא משתנה, ולכן כל
 * mastery / graduation / telemetry (שכולם ממופתחים לפי id) נשארים.
 * birthDate: null מוחק את תאריך-הלידה; undefined משאיר כמו שהיה.
 * מחזיר את הפרופיל כפי שנטען מחדש (גיל נגזר מ-birthDate אם קיים).
 */
export function updateProfile(
  id: string,
  patch: {
    name?: string;
    age?: number;
    birthDate?: string | null;
    addressForm?: AddressForm;
  },
): Profile | null {
  const all = loadProfiles();
  const idx = all.findIndex((p) => p.id === id);
  const prev = all[idx];
  if (prev === undefined) return null;
  const next: Profile = {
    ...prev,
    name: patch.name !== undefined ? patch.name.trim() : prev.name,
    age: patch.age ?? prev.age,
    ...(patch.addressForm !== undefined
      ? { addressForm: patch.addressForm }
      : {}),
  };
  if (patch.birthDate === null) {
    delete next.birthDate;
  } else if (patch.birthDate !== undefined) {
    next.birthDate = patch.birthDate;
  }
  next.allowedSkills = allowedSkillsForAge(next.age);
  const updated = [...all];
  updated[idx] = next;
  saveProfiles(updated);
  return loadProfiles().find((p) => p.id === id) ?? next;
}

export function setActiveProfileId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id === null) {
    window.localStorage.removeItem(ACTIVE_KEY);
    return;
  }
  window.localStorage.setItem(ACTIVE_KEY, id);
}

export function getActiveProfileId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_KEY);
}

export function getActiveProfile(): Profile | null {
  const id = getActiveProfileId();
  if (!id) return null;
  return loadProfiles().find((p) => p.id === id) ?? null;
}

export function profileAllowsSkill(profile: Profile, skill: Skill): boolean {
  return profile.allowedSkills.includes(skill);
}

export function deleteProfile(id: string): void {
  const remaining = loadProfiles().filter((p) => p.id !== id);
  saveProfiles(remaining);
  if (getActiveProfileId() === id) setActiveProfileId(null);
  purgeProfileStorage(id);
  clearTelemetry(id);
}
