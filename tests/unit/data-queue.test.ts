/**
 * ACCOUNTS-001 · P1 — תור-הכתיבה.
 *
 * הבדיקה הזו מגנה על **תשובות של ילדה**. בלי התור, שתי קריאות
 * `logEvent` צמודות (`session/page.tsx:448,453`) מאבדות אירוע כשהאחסון
 * מפסיק לענות מיד — בלי קריסה, בלי שגיאה, בלי שאף אחד ידע.
 *
 * הבדיקה הראשונה **מדגימה את הבאג** מול אחסון איטי בלי תור. אם היא
 * תתחיל לעבור, סימן שהמרוץ נעלם ואפשר לוותר על התור — לא להפך.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  withKeyLock,
  drainQueues,
  queueSize,
  __resetQueues,
} from "@/lib/data/queue";

/** אחסון-דמה שעונה אחרי המתנה — כמו רשת, לא כמו localStorage. */
function slowStore() {
  const data = new Map<string, string>();
  const delay = () => new Promise((r) => setTimeout(r, 5));
  return {
    data,
    async get(k: string) {
      await delay();
      return data.get(k) ?? null;
    },
    async set(k: string, v: string) {
      await delay();
      data.set(k, v);
    },
  };
}

describe("תור-כתיבה — קריאה-שינוי-כתיבה על אותו מפתח", () => {
  beforeEach(() => __resetQueues());

  it("🔴 בלי תור: שתי הוספות צמודות מאבדות אירוע", async () => {
    const store = slowStore();
    const append = async (ev: string) => {
      const raw = await store.get("k");
      const arr: string[] = raw ? JSON.parse(raw) : [];
      arr.push(ev);
      await store.set("k", JSON.stringify(arr));
    };

    // בדיוק הצורה שבסשן: שתי קריאות בלי להמתין לראשונה.
    await Promise.all([append("session_start"), append("item_shown")]);

    const saved = JSON.parse(store.data.get("k")!) as string[];
    // זו התיעוד של הבאג, לא של ההתנהגות הרצויה.
    expect(saved).toHaveLength(1);
  });

  it("✅ עם תור: שתי ההוספות שורדות, בסדר הנכון", async () => {
    const store = slowStore();
    const append = (ev: string) =>
      withKeyLock("k", async () => {
        const raw = await store.get("k");
        const arr: string[] = raw ? JSON.parse(raw) : [];
        arr.push(ev);
        await store.set("k", JSON.stringify(arr));
      });

    await Promise.all([append("session_start"), append("item_shown")]);

    const saved = JSON.parse(store.data.get("k")!) as string[];
    expect(saved).toEqual(["session_start", "item_shown"]);
  });

  it("שומר על הסדר גם ב-20 הוספות במקביל", async () => {
    const store = slowStore();
    const append = (n: number) =>
      withKeyLock("k", async () => {
        const raw = await store.get("k");
        const arr: number[] = raw ? JSON.parse(raw) : [];
        arr.push(n);
        await store.set("k", JSON.stringify(arr));
      });

    await Promise.all(Array.from({ length: 20 }, (_, i) => append(i)));

    const saved = JSON.parse(store.data.get("k")!) as number[];
    expect(saved).toEqual(Array.from({ length: 20 }, (_, i) => i));
  });

  it("מפתחות שונים אינם חוסמים זה את זה", async () => {
    const order: string[] = [];
    const slow = withKeyLock("a", async () => {
      await new Promise((r) => setTimeout(r, 30));
      order.push("slow");
    });
    const fast = withKeyLock("b", async () => {
      order.push("fast");
    });
    await Promise.all([slow, fast]);
    // המהיר לא חיכה לאיטי — אחרת התור היה מנעול גלובלי.
    expect(order).toEqual(["fast", "slow"]);
  });

  it("עבודה שנכשלת אינה מפילה את מי שאחריה", async () => {
    const done: string[] = [];
    const failing = withKeyLock("k", async () => {
      throw new Error("boom");
    });
    const after = withKeyLock("k", async () => {
      done.push("ran");
    });

    await expect(failing).rejects.toThrow("boom");
    await after;
    expect(done).toEqual(["ran"]);
  });

  it("drainQueues ממתין לכל מה שתלוי באוויר", async () => {
    let landed = false;
    void withKeyLock("k", async () => {
      await new Promise((r) => setTimeout(r, 20));
      landed = true;
    });
    await drainQueues();
    expect(landed).toBe(true);
  });
});

describe("תור-כתיבה — ניקוי זיכרון", () => {
  beforeEach(() => __resetQueues());

  it("🔴 המפה אינה גדלה לנצח — מפתח מתנקה אחרי שהעבודה נגמרה", async () => {
    // 2000 אירועים × 6 ילדים זה בדיוק התרחיש שמסמך-המשימה מסמן
    // כסכנת-מכסה. תור שלא מתנקה מוסיף לזה דליפה משלו.
    for (let i = 0; i < 50; i++) {
      await withKeyLock(`key-${i}`, async () => {});
    }
    await drainQueues();
    expect(queueSize()).toBe(0);
  });
});

describe("תור-כתיבה — drainQueues אינו פותח מרוץ בעצמו", () => {
  beforeEach(() => __resetQueues());

  it("🔴 כתיבה שנכנסת תוך כדי ניקוז אינה עוקפת את מי שלפניה", async () => {
    // נמצא בסקירה 22.8: `chains.clear()` לפני ההמתנה שחרר את
    // השרשרת, והכתיבה החדשה רצה ראשונה. זה בדיוק המרוץ שהמודול
    // אמור למנוע — שנפתח על ידי המודול עצמו.
    const order: string[] = [];
    void withKeyLock("k", async () => {
      await new Promise((r) => setTimeout(r, 40));
      order.push("first");
    });

    const draining = drainQueues();
    // נכנסת באמצע הניקוז, על אותו מפתח.
    void withKeyLock("k", async () => {
      order.push("second");
    });
    await draining;

    expect(order).toEqual(["first", "second"]);
  });
});
