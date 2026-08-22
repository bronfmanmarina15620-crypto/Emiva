/**
 * 🔴 ACCOUNTS-001 · P1 — למה שומר-ה-ref, ולא שומר-ה-phase.
 *
 * **מה הבדיקה הזו מוכיחה, ומה לא.** בדיקת-ה-UI
 * (`tests/ui/session-double-click.test.tsx`) עוברת **גם בלי** השומר,
 * כי כל עוד השמירה סינכרונית `phase` מספיק לחסום שליחה שנייה.
 * זה נבדק במפורש 22.8 — הסרת השומר לא הפילה אותה.
 *
 * לכן היא אינה מספיקה. הבדיקה כאן מדמה את מה ש-P2 יביא: **מצב-React
 * שמתעדכן מאוחר**. זו הצורה שבה המרוץ נפתח, וזה מה שהשומר קיים בשבילו.
 *
 * שני המימושים למטה הם התמצית של `processAnswer`, בלי React:
 * אחד נשען על `phase` (מתעדכן אחרי המתנה) והשני על ref (מיידי).
 */
import { describe, it, expect } from "vitest";

type Phase = "active" | "correct";

/** שומר מבוסס-state — נשבר כשהעדכון מאוחר. זה המצב היום. */
function phaseGuarded() {
  let phase: Phase = "active";
  const attempts: string[] = [];
  const submit = async (answer: string) => {
    if (phase !== "active") return;
    // ה-await מדמה שמירה לשרת. `phase` עדיין "active" עבור הקורא הבא.
    await new Promise((r) => setTimeout(r, 5));
    attempts.push(answer);
    phase = "correct";
  };
  return { submit, attempts: () => attempts };
}

/** שומר מבוסס-ref — נסגר סינכרונית, לפני ההמתנה. */
function refGuarded() {
  let phase: Phase = "active";
  let submitting = false;
  const attempts: string[] = [];
  const submit = async (answer: string) => {
    if (phase !== "active") return;
    if (submitting) return;
    submitting = true;
    await new Promise((r) => setTimeout(r, 5));
    attempts.push(answer);
    phase = "correct";
  };
  return { submit, attempts: () => attempts };
}

describe("🔴 שומר-השליחה בסשן — קרדיט-השליטה", () => {
  it("שומר מבוסס-phase נשבר ברגע שהשמירה אינה מיידית", async () => {
    const s = phaseGuarded();
    // שתי לחיצות באותו tick — בדיוק מה שילדה עושה על כפתור איטי.
    await Promise.all([s.submit("7"), s.submit("7")]);
    // תיעוד הבאג: שני ניסיונות על אותו פריט.
    expect(s.attempts()).toHaveLength(2);
  });

  it("שומר מבוסס-ref מחזיק — ניסיון אחד בלבד", async () => {
    const s = refGuarded();
    await Promise.all([s.submit("7"), s.submit("7")]);
    expect(s.attempts()).toHaveLength(1);
  });

  it("גם חמש לחיצות מהירות נספרות כאחת", async () => {
    const s = refGuarded();
    await Promise.all(Array.from({ length: 5 }, () => s.submit("7")));
    expect(s.attempts()).toHaveLength(1);
  });
});
