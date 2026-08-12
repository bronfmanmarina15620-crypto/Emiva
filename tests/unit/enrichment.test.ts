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
