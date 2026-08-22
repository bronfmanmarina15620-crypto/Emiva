// @vitest-environment jsdom
/**
 * 🔴 ACCOUNTS-001 · P1 — מסלול התשובה **הנכונה**.
 *
 * **הפער:** `processAnswer` יוצא בענף `correct` ובענף `reveal` בלי
 * לשחרר את השומר — השחרור נשען כולו על `advance()`. אם הוא לא
 * קורה, ילדה שענתה **נכון** ולחצה "המשך" נתקעת מול מסך מת.
 *
 * **⚠️ למה הבדיקה עונה נכון ולא "מנסה משהו" (תוקן 22.8):**
 * הגרסה הראשונה הזינה ערך קבוע ("4") ו-30 מתוך 30 סשנים הגיעו
 * למסך-**החשיפה**, לא למסך-הנכון. כלומר היא נשאה את השם של מסלול
 * ה-correct ובדקה את מסלול ה-reveal. מוטציה שמשאירה **בדיוק**
 * ילדה שענתה נכון תקועה (`if (phase !== "correct")`) עברה אצלה
 * ירוק. לכן התשובה נגזרת **מהתרגיל שעל המסך**.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const routerMock = { push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => routerMock }));

import SessionPage from "@/app/session/page";
import ADD_SUB from "@/content/math/add-sub-100.json";
import MULT from "@/content/math/multiplication.json";
import { createProfile, setActiveProfileId } from "@/lib/profiles";
import { exportTelemetry, type TelemetryEvent } from "@/lib/telemetry";

type AttemptEvent = Extract<TelemetryEvent, { t: "attempt" }>;

function attemptsOf(profileId: string): AttemptEvent[] {
  const all = JSON.parse(exportTelemetry(profileId)) as TelemetryEvent[];
  return all.filter((e): e is AttemptEvent => e.t === "attempt");
}

/**
 * מוצא את התשובה הנכונה לפריט שעל המסך — **לפי המאגר**, לא לפי
 * פענוח-טקסט. שליש מפריטי גיל 8 הם בעיות-מילים ("קניתי גלידה
 * ב-3₪..."), שאין בהן תבנית "a + b = ?" כלל.
 */
function correctAnswerOnScreen(): string {
  const text = document.body.textContent ?? "";
  const bank = [...ADD_SUB, ...MULT] as Array<{
    prompt: string;
    answer: number;
  }>;
  const hit = bank.find((i) => text.includes(i.prompt));
  if (!hit) {
    throw new Error("לא זוהה פריט על המסך: " + text.slice(0, 140));
  }
  return String(hit.answer);
}

/** עונה **נכון** על הפריט הנוכחי. */
function answerCorrectly(): void {
  const value = correctAnswerOnScreen();
  const choice = screen.queryByRole("button", { name: value });
  if (choice) {
    fireEvent.click(choice);
    return;
  }
  const input = screen.getByRole("spinbutton");
  fireEvent.change(input, { target: { value } });
  fireEvent.submit(input.closest("form")!);
}

beforeEach(() => {
  localStorage.clear();
});

describe("🔴 סשן — השומר משתחרר גם אחרי תשובה נכונה", () => {
  it("עונים נכון, ממשיכים, ועונים נכון שוב — הניסיון השני נרשם", async () => {
    const p = createProfile("ילדה", 8, "2018-01-01");
    setActiveProfileId(p.id);

    render(<SessionPage />);
    fireEvent.click(await screen.findByRole("button", { name: "נתחיל" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "נתחיל" })).toBeNull(),
    );

    // פריט ראשון — תשובה נכונה בניסיון הראשון.
    answerCorrectly();
    await waitFor(() => expect(attemptsOf(p.id).length).toBe(1));

    const first = attemptsOf(p.id)[0]!;
    // 🔴 הליבה: זה **חייב** להיות מסלול ה-correct, אחרת הבדיקה
    // בודקת משהו אחר משמה — הכשל שתוקן ב-22.8.
    expect(first.correct).toBe(true);
    expect(first.attemptIdx).toBe(0);

    // מסך "נכון" → "המשך" → advance() משחרר את השומר.
    const cont = await screen.findByRole("button", { name: "המשך" });
    fireEvent.click(cont);

    // 🔴 הרגע הקריטי: הפריט הבא. שומר נעול = מסך מת.
    await waitFor(() => expect(screen.getByRole("spinbutton")).toBeTruthy());
    answerCorrectly();
    await waitFor(() => expect(attemptsOf(p.id).length).toBe(2), {
      timeout: 3000,
    });

    // הניסיון השני על פריט **אחר** — כלומר באמת התקדמנו.
    const second = attemptsOf(p.id)[1]!;
    expect(second.itemId).not.toBe(first.itemId);
  });
});
