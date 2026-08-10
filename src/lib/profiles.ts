import type { Skill } from "./types";
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
  // Marina 2026-08-01: כיוון-קושי ידני. הרמה מחושבת מחדש אחרי כל שאלה
  // לפי אחוז ההצלחה, ולכן הורדה חד-פעמית נמחקת תוך סשן. הערך הזה נשמר
  // בפרופיל ומופחת מהרמה המחושבת בכל פעם, כך שההורדה מחזיקה.
  // רלוונטי כשההורה עוזרת לילדה: ההצלחות נרשמות כשלה, הציון מנופח,
  // והמערכת מסיקה רמה גבוהה מדי.
  difficultyOffset?: number;
  // CORE-ENGLISH-PHONICS-001: מהירות ההקראה באנגלית, בשליטת הבת.
  // רעיון של Marina (2026-08-10) — כל בת מווסתת את הקצב שנוח לה
  // במקום ערך אחיד שנקבע מראש. נשמר פר-פרופיל.
  speechRate?: number;
};

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

// Marina 2026-08-01: אוולין מצליחה רק אחרי שמרינה מסבירה לה, ולכן הציון
// שלה מנופח והמערכת מכוונת אותה לרמה גבוהה מדי.
//
// גרסה ראשונה של הזריעה הזו הותנתה בשם "אוולין" ולא הגיעה אליה בפועל
// (השם השמור בפרופיל אינו בהכרח זהה). מהיום ההתניה היא על **גיל**
// 7–8 — אין דרך לפספס, ואין תלות באיות. ערך שכבר קיים בפרופיל
// לא נדרס, כך שכיוון ידני עתידי מנצח את הזריעה.
const SEED_OFFSET_AGE_MIN = 7;
const SEED_OFFSET_AGE_MAX = 8;

function seedDifficultyOffset(age: number): number {
  return age >= SEED_OFFSET_AGE_MIN && age <= SEED_OFFSET_AGE_MAX ? 1 : 0;
}

export function setDifficultyOffset(profileId: string, offset: number): void {
  const all = loadProfiles();
  saveProfiles(
    all.map((p) => (p.id === profileId ? { ...p, difficultyOffset: offset } : p)),
  );
}

/**
 * CORE-ENGLISH-PHONICS-001 — שמירת מהירות ההקראה שהבת בחרה.
 *
 * בניגוד ל-difficultyOffset, אין כאן זריעה אוטומטית: ערך חסר פירושו
 * "עוד לא בחרה", והקורא נופל לברירת-המחדל. כך בחירה מפורשת של הבת
 * לעולם לא נדרסת בטעינה הבאה.
 */
export function setSpeechRate(profileId: string, rate: number): void {
  const all = loadProfiles();
  saveProfiles(
    all.map((p) => (p.id === profileId ? { ...p, speechRate: rate } : p)),
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
    return arr.map((p) => {
      const derived =
        p.birthDate !== undefined ? ageFromBirthDate(p.birthDate) : null;
      const age = derived ?? p.age;
      // `0` נחשב "לא הוגדר" ולא רק `undefined`: גרסת-הזריעה הקודמת
      // (לפי שם) כתבה 0 לפרופילים שלא התאימו, וזה היה חוסם את הזריעה
      // לפי גיל. כיוון ידני שאינו-אפס תמיד מנצח.
      const withOffset =
        p.difficultyOffset === undefined || p.difficultyOffset === 0
          ? { ...p, difficultyOffset: seedDifficultyOffset(age) }
          : p;
      return { ...withOffset, age, allowedSkills: allowedSkillsForAge(age) };
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
): Profile {
  const profile: Profile = {
    id: newProfileId(),
    name: name.trim(),
    age,
    ...(birthDate !== undefined ? { birthDate } : {}),
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
  patch: { name?: string; age?: number; birthDate?: string | null },
): Profile | null {
  const all = loadProfiles();
  const idx = all.findIndex((p) => p.id === id);
  const prev = all[idx];
  if (prev === undefined) return null;
  const next: Profile = {
    ...prev,
    name: patch.name !== undefined ? patch.name.trim() : prev.name,
    age: patch.age ?? prev.age,
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
