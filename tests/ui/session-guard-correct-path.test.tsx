// @vitest-environment jsdom
/**
 * 🔴 ACCOUNTS-001 · P1 — מסלול התשובה **הנכונה**.
 *
 * **הפער שנמצא בסקירה (22.8):** `processAnswer` יוצא בענף
 * `correct` ובענף `reveal` **בלי לשחרר את השומר** — השחרור נשען
 * כולו על `advance()`. הבדיקה הקודמת כיסתה רק את מסלול ה-retry,
 * ולכן הסרת השחרור מ-`advance` עברה ירוקה ב-120 בדיקות.
 *
 * התרחיש שנשאר לא-מכוסה הוא **מסלול הרוב**: ילדה עונה נכון,
 * לוחצת "המשך" — ואם השומר לא השתחרר, הפריט הבא לא מגיב ללחיצות.
 * מסך מת בלי הודעה.
 *
 * הבדיקה עונה נכון, ממשיכה, ועונה שוב — ומוודאת שהניסיון השני נרשם.
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

/** לוחץ על כל כפתור-המשך שמופיע (נכון / חשיפה). */
function clickContinue(): boolean {
  const btn =
    screen.queryByRole("button", { name: "המשך" }) ??
    screen.queryByRole("button", { name: "הבנתי — המשך" });
  if (!btn) return false;
  fireEvent.click(btn);
  return true;
}

/** עונה על הפריט הנוכחי; מנסה את כל האפשרויות עד שאחת נכונה. */
function answerAnything(): void {
  const choices = screen.queryAllByRole("button", { name: /^\d+$/ });
  if (choices.length > 0) {
    fireEvent.click(choices[0]!);
    return;
  }
  const input = screen.queryByRole("spinbutton");
  if (!input) return;
  fireEvent.change(input, { target: { value: "4" } });
  fireEvent.submit(input.closest("form")!);
}

beforeEach(() => {
  localStorage.clear();
});

describe("🔴 סשן — השומר משתחרר גם אחרי תשובה נכונה", () => {
  it("עונים, ממשיכים, ועונים שוב — הניסיון השני נרשם", async () => {
    const p = createProfile("ילדה", 8, "2018-01-01");
    setActiveProfileId(p.id);

    render(<SessionPage />);
    fireEvent.click(await screen.findByRole("button", { name: "נתחיל" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "נתחיל" })).toBeNull(),
    );

    // פריט ראשון — עונים עד שמגיעים למסך-המשך (נכון או חשיפה).
    for (let i = 0; i < 4 && !clickContinue(); i++) {
      answerAnything();
      await waitFor(() => expect(attemptsOf(p.id).length).toBeGreaterThan(0));
    }
    // כאן כבר עברנו את הפריט הראשון דרך advance().
    const afterFirstItem = attemptsOf(p.id).length;
    expect(afterFirstItem).toBeGreaterThan(0);

    // 🔴 הרגע הקריטי: הפריט הבא. אם השומר נשאר נעול — כלום לא יקרה.
    answerAnything();
    await waitFor(
      () => expect(attemptsOf(p.id).length).toBeGreaterThan(afterFirstItem),
      { timeout: 3000 },
    );
  });
});
