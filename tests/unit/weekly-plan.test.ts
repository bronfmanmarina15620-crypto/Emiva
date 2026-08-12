import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  dayFor,
  planForAge,
  todayHeadline,
  todayIndex,
  type DayId,
} from "@/lib/weekly-plan";
import { ENRICHMENT_TOPICS } from "@/lib/enrichment";

// PLAN-WEEKLY-001 — לוח השבוע לפי MyLevel §7.
//
// §7 נפתח במשפט שקובע את אופי המסך: "זה לא תוכנית ברזל — זה מתווה.
// יום מחמיצים? לא קטסטרופה. העקביות היא על פני שבועות, לא ימים."
// הבדיקות כאן שומרות בעיקר על **מה שהמסך אינו עושה**: אינו עוקב,
// אינו מסמן בוצע, ואינו ממלא את יום המנוחה.

const SRC = path.resolve(
  __dirname,
  "..",
  "..",
  "src",
  "lib",
  "weekly-plan.ts",
);

describe("לוח השבוע — מבנה לפי §7", () => {
  it("שני הלוחות מכסים שבוע מלא, ראשון עד שבת", () => {
    for (const age of [7, 9]) {
      const week = planForAge(age);
      expect(week.length).toBe(7);
      expect(week.map((d) => d.day)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    }
  });

  it("גיל 7–8 מקבל את לוח §7.1, וגיל 9+ את §7.2", () => {
    expect(planForAge(7)).toBe(planForAge(8));
    expect(planForAge(9)).toBe(planForAge(10));
    expect(planForAge(8)).not.toBe(planForAge(9));
  });

  it("שבת ריקה בשני הלוחות — §2 מגדיר זמן ריק כתנאי-סף", () => {
    // זו אינה החלטה אסתטית: §2 קובע שזמן ריק "חשוב יותר מכל 13
    // הנושאים יחד". יום מנוחה שמתמלא בהצעות מבטל את הסעיף.
    for (const age of [7, 9]) {
      const saturday = dayFor(age, 6);
      expect(saturday.rest).toBe(true);
      expect(saturday.core.length).toBe(0);
      expect(saturday.enrichment).toBeNull();
      expect(saturday.enrichmentLabel).toBeUndefined();
    }
  });

  it("שישי בלי תרגול Core בשני הלוחות", () => {
    for (const age of [7, 9]) {
      expect(dayFor(age, 5).core.length).toBe(0);
    }
  });

  it("בת 7 מקבלת נושא העשרה אחר בכל יום פעיל", () => {
    const week = planForAge(7);
    const topics = week
      .map((d) => d.enrichment)
      .filter((t): t is NonNullable<typeof t> => t !== null);
    expect(new Set(topics).size).toBe(topics.length);
  });

  it("כל נושא העשרה בלוח קיים במאגרים בפועל", () => {
    // מגן על הדפוס שנתפס ב-ENRICH-GEO-001: מחרוזת נושא שאינה
    // מחוברת למאגר מציגה תוכן של נושא אחר, בשקט.
    for (const age of [7, 9]) {
      for (const d of planForAge(age)) {
        if (d.enrichment) {
          expect(
            ENRICHMENT_TOPICS,
            `${d.name}: נושא ${d.enrichment} אינו ברשימת הנושאים`,
          ).toContain(d.enrichment);
        }
      }
    }
  });

  it("ערבית מוצגת כמתוכננת אך בלי קישור — היא חסומה ב-BL-006", () => {
    // §7.1 מציב ערבית ביום חמישי. אין לה מאגר (דורש בקרת דוברת),
    // ולכן היא מופיעה כטקסט בלבד. לוח שמסתיר את מה שחסר משקר על
    // התוכנית; לוח שמקשר לתוכן שאינו קיים שובר את המסך.
    const thursday = dayFor(7, 4);
    expect(thursday.enrichment).toBeNull();
    expect(thursday.enrichmentLabel).toContain("ערבית");
  });

  it("בת 9 עובדת דרך פרויקט, לא נושא-ליום (§7.2)", () => {
    for (const d of [0, 1, 2, 3, 4] as DayId[]) {
      const day = dayFor(9, d);
      expect(day.enrichment).toBeNull();
      expect(day.enrichmentLabel).toBeTruthy();
    }
  });
});

describe("לוח השבוע — מתווה ולא מטלה", () => {
  it("המודול אינו נוגע במצב, במעקב או בשליטה", () => {
    // 🔴 הכלל המרכזי. ברגע שהלוח יודע מה הילדה עשתה, הוא הופך
    // לצ'קליסט — ו-§7 אומר במפורש "יום מחמיצים? לא קטסטרופה".
    const src = fs.readFileSync(SRC, "utf8");
    for (const forbidden of [
      "storage",
      "telemetry",
      "mastery",
      "localStorage",
    ]) {
      expect(src, `weekly-plan מייבא ${forbidden} — זה הופך מתווה למעקב`).not.toContain(
        `from "@/lib/${forbidden}`,
      );
    }
  });

  it("אין שדה שמסמן ביצוע או רצף", () => {
    const src = fs.readFileSync(SRC, "utf8");
    for (const bad of ["done:", "completed", "streak", "checked"]) {
      expect(src, `נמצא "${bad}" — הלוח אינו עוקב אחרי ביצוע`).not.toContain(bad);
    }
  });

  it("הכותרת מזמינה ואינה מצווה", () => {
    // אותה רוח שנאכפת בדשבורד ההורה (guardrails §2): בלי ציוויים.
    for (const age of [7, 9]) {
      for (const d of planForAge(age)) {
        const line = todayHeadline(d);
        for (const bad of ["חייבת", "צריכה", "עלייך", "אסור"]) {
          expect(line, `"${line}" מכיל ניסוח מצווה`).not.toContain(bad);
        }
      }
    }
  });

  it("יום מנוחה מקבל ניסוח שמסביר, לא מתנצל", () => {
    const line = todayHeadline(dayFor(7, 6));
    expect(line).toContain("בכוונה");
  });
});

describe("לוח השבוע — היום הנוכחי", () => {
  it("todayIndex מחזיר את היום בשבוע, וניתן להזרקה", () => {
    // הזרקה חיונית: בלעדיה כל בדיקה של המסך תלויה ביום שבו היא רצה.
    expect(todayIndex(new Date(2026, 7, 9))).toBe(0); // ראשון
    expect(todayIndex(new Date(2026, 7, 15))).toBe(6); // שבת
  });

  it("לכל יום בשבוע יש כרטיס, כולל יום המנוחה", () => {
    for (let d = 0; d <= 6; d++) {
      expect(dayFor(7, d as DayId), `יום ${d} חסר`).toBeDefined();
      expect(dayFor(9, d as DayId), `יום ${d} חסר`).toBeDefined();
    }
  });
});
