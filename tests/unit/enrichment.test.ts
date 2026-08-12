import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  activitiesFor,
  activityOfWeek,
  ageBandFor,
  bankFor,
  ENRICHMENT_TOPICS,
  weekIndex,
  type EnrichmentActivity,
} from "@/lib/enrichment";

/**
 * MyLevel.docx §1, שכבה 2: "נושאי תוכן עשירים... לא תרגול שיטתי.
 * איך: ניסוי, משחק, סרט, סיפור, מפה. אין מבחנים. מדידה: רכה."
 *
 * הבדיקות כאן שומרות בעיקר על **ההפרדה בין השכבות** — לא על נכונות
 * תשובות, כי בהעשרה אין תשובה נכונה.
 */

describe("העשרה — בידוד משכבת Core", () => {
  const src = readFileSync("src/lib/enrichment.ts", "utf8");

  it.each(["mastery", "srs", "measurement", "adaptive"])(
    "אינו מייבא %s",
    (mod) => {
      const importsIt = new RegExp(`from\\s+["'].*${mod}`).test(src);
      expect(
        importsIt,
        `enrichment.ts מייבא ${mod} — זה המנוע של שכבה 1. §1 מפריד ` +
          `בין השכבות בכוונה, והבאת הכלים האלה מוחקת את ההפרדה.`,
      ).toBe(false);
    },
  );

  it("אין במבנה הפעילות שדה תשובה, ניקוד או קושי", () => {
    for (const topic of ENRICHMENT_TOPICS) {
      for (const a of bankFor(topic)) {
        const keys = Object.keys(a);
        for (const forbidden of ["answer", "correct", "score", "difficulty"]) {
          expect(
            keys,
            `${a.id} מכיל "${forbidden}" — בהעשרה אין תשובה נכונה`,
          ).not.toContain(forbidden);
        }
      }
    }
  });
});

describe("העשרה — שלמות המאגרים", () => {
  it.each(ENRICHMENT_TOPICS)("%s — יש פעילויות לשתי קבוצות הגיל", (topic) => {
    expect(activitiesFor(topic, 7).length).toBeGreaterThan(0);
    expect(activitiesFor(topic, 9).length).toBeGreaterThan(0);
  });

  it("כל פעילות נושאת הסבר, משאב ורמז להורה", () => {
    for (const topic of ENRICHMENT_TOPICS) {
      for (const a of bankFor(topic) as EnrichmentActivity[]) {
        expect(a.title.trim(), `${a.id}: כותרת ריקה`).not.toBe("");
        expect(a.activity.trim(), `${a.id}: אין פעילות`).not.toBe("");
        // §4.1: "הדגש: 'למה זה קורה?'" — הסבר הוא חובה, לא קישוט.
        expect(a.why.trim(), `${a.id}: אין הסבר "למה"`).not.toBe("");
        expect(a.resource.trim(), `${a.id}: אין משאב`).not.toBe("");
        // §4.4: "ההורה משחק/ת איתן — לא מסך בלבד".
        expect(a.parentTip.trim(), `${a.id}: אין רמז להורה`).not.toBe("");
      }
    }
  });

  it("אין מזהים כפולים", () => {
    const ids = ENRICHMENT_TOPICS.flatMap((t) => bankFor(t).map((a) => a.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("אין שתי פעילויות עם אותה כותרת באותה קבוצת גיל", () => {
    for (const topic of ENRICHMENT_TOPICS) {
      for (const age of [7, 9]) {
        const titles = activitiesFor(topic, age).map((a) => a.title);
        expect(new Set(titles).size).toBe(titles.length);
      }
    }
  });
});

/**
 * 🔴 הלקח מקודד (2026-08-12): Marina פתחה את מסך ההעשרה, קראה
 * "הדגימי עם שמן, מים וסבון" — ולא הבינה מה לעשות. בלי כמויות,
 * בלי סדר פעולות ובלי "מה אמור לקרות", `activity` הוא **כותרת
 * ולא הוראה**, וילדה בת 9 לא יכולה לבצע ממנו.
 *
 * הכלל: אם ההורה לא מבינה — הילדה בוודאי לא. הבדיקות כאן הופכות
 * את זה מהערה בפרוזה לכשל רועש ב-CI.
 */
describe("העשרה — פעילות חייבת להיות בת-ביצוע", () => {
  it("לכל פעילות יש שלבים ממוספרים, לא רק משפט כותרת", () => {
    for (const topic of ENRICHMENT_TOPICS) {
      for (const a of bankFor(topic) as EnrichmentActivity[]) {
        expect(
          a.steps,
          `${a.id} ("${a.title}") — אין שלבים. משפט אחד הוא כותרת, ` +
            `לא הוראה: ילדה לא יכולה לבצע ממנו.`,
        ).toBeDefined();
        expect(
          a.steps!.length,
          `${a.id}: פחות מ-3 שלבים — כנראה עדיין כותרת מוסווית`,
        ).toBeGreaterThanOrEqual(3);
        for (const s of a.steps!) {
          expect(s.trim(), `${a.id}: שלב ריק`).not.toBe("");
        }
      }
    }
  });

  it("לכל פעילות יש 'מה אמור לקרות'", () => {
    // בלי זה אי אפשר לדעת אם הניסוי נכשל או שפשוט בוצע אחרת —
    // וזה מה שהופך פעילות ל"עשינו, לא קרה כלום, נמאס".
    for (const topic of ENRICHMENT_TOPICS) {
      for (const a of bankFor(topic) as EnrichmentActivity[]) {
        expect(
          a.expected?.trim(),
          `${a.id} ("${a.title}") — אין "מה אמור לקרות"`,
        ).toBeTruthy();
      }
    }
  });

  it("לכל פעילות יש רשימת ציוד", () => {
    for (const topic of ENRICHMENT_TOPICS) {
      for (const a of bankFor(topic) as EnrichmentActivity[]) {
        expect(
          a.materials?.length,
          `${a.id} ("${a.title}") — אין רשימת ציוד. הילדה תגלה באמצע ` +
            `שחסר משהו.`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("לכל פעילות יש ניחוש מקדים (§4.1 Guided Inquiry)", () => {
    for (const topic of ENRICHMENT_TOPICS) {
      for (const a of bankFor(topic) as EnrichmentActivity[]) {
        expect(
          a.predict?.trim(),
          `${a.id} ("${a.title}") — אין ניחוש מקדים. §4.1 דורש ` +
            `שהילדה תנחש לפני שהיא בודקת.`,
        ).toBeTruthy();
      }
    }
  });

  it("'מה אמור לקרות' אינו מסגיר את ההסבר", () => {
    // ה"למה" חייב להישאר מוסתר עד "כבר ניסיתי" — אחרת שדה
    // ה-expected עוקף את Guided Inquiry ומגיש את התשובה מראש.
    for (const topic of ENRICHMENT_TOPICS) {
      for (const a of bankFor(topic) as EnrichmentActivity[]) {
        expect(
          a.expected,
          `${a.id}: "מה אמור לקרות" זהה להסבר — זה מבטל את ההסתרה`,
        ).not.toBe(a.why);
      }
    }
  });

  it("כל נושא ברשימה מחזיר מאגר משלו, ולא של נושא אחר", () => {
    // `bankFor` היה כתוב כשלישייה (`topic === "science" ? A : B`) —
    // צורה שעובדת בדיוק לשני נושאים ומחזירה בשקט את המאגר האחרון
    // לכל נושא שלישי. גיאוגרפיה הייתה מציגה חידות לוגיקה בלי
    // ששום בדיקה תיפול. נתפס בהוספת הנושא השלישי (2026-08-12).
    const seen = new Map<string, string>();
    for (const topic of ENRICHMENT_TOPICS) {
      const bank = bankFor(topic) as EnrichmentActivity[];
      expect(bank.length, `${topic}: מאגר ריק`).toBeGreaterThan(0);
      for (const a of bank) {
        expect(a.topic, `${a.id} יושב במאגר של ${topic}`).toBe(topic);
        const prev = seen.get(a.id);
        expect(prev, `${a.id} מופיע גם ב-${prev}`).toBeUndefined();
        seen.set(a.id, topic);
      }
    }
  });
});

describe("העשרה — גיאוגרפיה היא חקירה, לא שינון", () => {
  // הסיכון הייחודי לנושא הזה: גיאוגרפיה מתפתה בקלות לרשימת בירות
  // ודגלים. §4 מגדיר את השכבה כחשיפה וסקרנות, ו-§4.1 קובע במפורש
  // "הדגש: 'למה זה קורה?' לא 'מה השם של זה?'".
  const GEO = bankFor("geography") as EnrichmentActivity[];

  it("יש 12 פעילויות, מחולקות שווה בין קבוצות הגיל", () => {
    expect(GEO.length).toBe(12);
    expect(GEO.filter((a) => a.ageBand === "7-8").length).toBe(6);
    expect(GEO.filter((a) => a.ageBand === "9-10").length).toBe(6);
  });

  it("כל פעילות דורשת פעולה בעולם, לא שליפה מהזיכרון", () => {
    // כל פעילות חייבת ציוד או שלבים שמתארים עשייה. פעילות בלי
    // שניהם היא שאלת-ידע במסווה.
    for (const a of GEO) {
      const hasWork = (a.materials?.length ?? 0) > 0 || (a.steps?.length ?? 0) > 0;
      expect(hasWork, `${a.id}: אין ציוד ואין שלבים — זו שאלה, לא פעילות`).toBe(
        true,
      );
    }
  });

  it("ההסבר עונה על 'למה', לא על 'איך קוראים לזה'", () => {
    for (const a of GEO) {
      // הסבר קצר מדי הוא כמעט תמיד הגדרה ולא סיבה.
      expect(
        a.why.length,
        `${a.id}: ההסבר קצר מכדי להסביר סיבה`,
      ).toBeGreaterThan(80);
    }
  });
});

describe("העשרה — בחירת פעילות השבוע", () => {
  it("גיל 7–8 וגיל 9–10 ממופים נכון", () => {
    expect(ageBandFor(7)).toBe("7-8");
    expect(ageBandFor(8)).toBe("7-8");
    expect(ageBandFor(9)).toBe("9-10");
    expect(ageBandFor(10)).toBe("9-10");
  });

  it("אותו שבוע נותן אותה פעילות (יציב לאורך השבוע)", () => {
    const now = Date.UTC(2026, 7, 12);
    const a = activityOfWeek("science", 7, now);
    const b = activityOfWeek("science", 7, now + 6 * 60 * 60 * 1000);
    expect(a?.id).toBe(b?.id);
  });

  it("שבוע הבא נותן פעילות אחרת", () => {
    const now = Date.UTC(2026, 7, 12);
    const week = 7 * 24 * 60 * 60 * 1000;
    const a = activityOfWeek("logic", 9, now);
    const b = activityOfWeek("logic", 9, now + week);
    expect(a?.id).not.toBe(b?.id);
  });

  it("הפעילות תמיד תואמת את גיל הילדה", () => {
    const week = 7 * 24 * 60 * 60 * 1000;
    const start = Date.UTC(2026, 7, 12);
    for (let i = 0; i < 20; i++) {
      const now = start + i * week;
      expect(activityOfWeek("science", 7, now)?.ageBand).toBe("7-8");
      expect(activityOfWeek("science", 9, now)?.ageBand).toBe("9-10");
    }
  });

  it("המאגר מתחזור כשנגמר — חזרה אינה כשל בהעשרה", () => {
    const week = 7 * 24 * 60 * 60 * 1000;
    const start = Date.UTC(2026, 7, 12);
    const pool = activitiesFor("science", 7).length;
    const first = activityOfWeek("science", 7, start);
    const afterCycle = activityOfWeek("science", 7, start + pool * week);
    expect(afterCycle?.id).toBe(first?.id);
  });

  it("weekIndex עולה בדיוק ב-1 בכל שבוע", () => {
    const now = Date.UTC(2026, 7, 12);
    const week = 7 * 24 * 60 * 60 * 1000;
    expect(weekIndex(now + week) - weekIndex(now)).toBe(1);
  });
});
