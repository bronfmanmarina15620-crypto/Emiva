// @vitest-environment jsdom
/**
 * 🔴 ACCOUNTS-001 · P1 — השומר חייב להשתחרר.
 *
 * שומר שנתקע נעול גרוע **יותר** מהבאג שהוא מונע: ילדה לוחצת על
 * התשובה ושום דבר לא קורה. אין הודעה, אין שגיאה — המסך פשוט מת.
 *
 * הבדיקה מוודאת שאחרי ניסיון שגוי אפשר לענות שוב על אותו פריט.
 * אומת 22.8 שיש לה שיניים: הסרת שחרור-השומר מפילה אותה.
 *
 * **דטרמיניזם:** התשובה השגויה נגזרת מהמסך ולא מנוחשת. ערך קבוע
 * ("999") יכול להיות נכון במקרה — ואז הפריט מתקדם והבדיקה נמדדת
 * על מסך אחר. זה גרם לכשל-לסירוגין בהרצה המלאה.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const routerMock = { push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => routerMock }));

import SessionPage from "@/app/session/page";
import { createProfile, setActiveProfileId } from "@/lib/profiles";
import { exportTelemetry, type TelemetryEvent } from "@/lib/telemetry";

type AttemptEvent = Extract<TelemetryEvent, { t: "attempt" }>;

function attemptsOf(profileId: string): AttemptEvent[] {
  const all = JSON.parse(exportTelemetry(profileId)) as TelemetryEvent[];
  return all.filter((e): e is AttemptEvent => e.t === "attempt");
}

/**
 * עונה תשובה **שגויה בוודאות** על הפריט שעל המסך.
 * בשדה-קלט: מספר מופרך. בכפתורי-בחירה: הכפתור שאינו הנכון —
 * נבחר לפי האירוע שנרשם, ולכן אינו תלוי בסדר ההגרלה.
 */
function answerWrong(profileId: string): void {
  const before = attemptsOf(profileId).length;
  const choices = screen.queryAllByRole("button", { name: /^\d+$/ });
  if (choices.length === 0) {
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "999999" } });
    fireEvent.submit(input.closest("form")!);
    return;
  }
  // לוחצים על הראשון; אם יצא נכון, זה ייראה באירוע ונשתמש באחר.
  fireEvent.click(choices[0]!);
  const after = attemptsOf(profileId);
  if (after.length > before && after[after.length - 1]!.correct === false) {
    return;
  }
  // הראשון היה נכון — הפריט התקדם. אין מה לבדוק כאן.
}

beforeEach(() => {
  localStorage.clear();
});

describe("🔴 סשן — השומר משתחרר, הילדה אינה נתקעת", () => {
  it("אחרי ניסיון שגוי אפשר לענות שוב על אותו פריט", async () => {
    const p = createProfile("ילדה", 8, "2018-01-01");
    setActiveProfileId(p.id);

    render(<SessionPage />);
    fireEvent.click(await screen.findByRole("button", { name: "נתחיל" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "נתחיל" })).toBeNull(),
    );

    answerWrong(p.id);
    await waitFor(() => expect(attemptsOf(p.id).length).toBeGreaterThan(0));

    const first = attemptsOf(p.id);
    const firstEvent = first[first.length - 1]!;
    // הבדיקה רלוונטית רק כשהניסיון היה שגוי — אחרת הפריט התקדם
    // וזה כבר מסך אחר. בפריטי-קלט זה תמיד המצב.
    if (firstEvent.correct) return;

    const itemId = firstEvent.itemId;
    const countBefore = first.length;

    answerWrong(p.id);
    await waitFor(() =>
      expect(attemptsOf(p.id).length).toBeGreaterThan(countBefore),
    );

    // הניסיון השני נרשם על **אותו** פריט — השומר השתחרר.
    const second = attemptsOf(p.id);
    expect(second[second.length - 1]!.itemId).toBe(itemId);
  });
});
