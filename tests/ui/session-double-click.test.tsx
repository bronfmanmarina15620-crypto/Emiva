// @vitest-environment jsdom
/**
 * 🔴 ACCOUNTS-001 · P1 — הבדיקה הקריטית ביותר לפדגוגיה במעבר ל-async.
 *
 * **הפער שהיא סוגרת:** עד 2026-08-22 היו 13 בדיקות-UI בריפו ולא
 * אחת מהן על דף-הסשן — כלומר המסך שבו הילדות עונות, והמסוכן ביותר
 * במעבר לשרת, היה היחיד בלי רשת-ביטחון.
 *
 * **מה נשמר כאן:** קרדיט-השליטה. `finishItem(attempts === 0)` נותן
 * קרדיט רק על ניסיון ראשון. אם לחיצה כפולה נספרת כשני ניסיונות,
 * ילדה שענתה **נכון מיד** מאבדת את הקרדיט, ואות ה-adaptive
 * difficulty מזדהם — כלומר האפליקציה מגישה לה חומר קל מדי.
 *
 * הבדיקה שולחת פעמיים **באותו tick**, בלי המתנה ביניהן — זו הצורה
 * שמדמה מרוץ, בניגוד לשתי לחיצות נפרדות.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const replaceMock = vi.fn();
/**
 * ⚠️ **הפניה יציבה, לא אובייקט חדש בכל render.**
 * ה-useEffect שמאתחל את הסשן תלוי ב-[router]. מוק שמחזיר אובייקט
 * טרי בכל קריאה משנה את הזהות בכל render, האפקט רץ שוב, והתוצאה
 * לולאה אינסופית שנגמרת ב-OOM של 2GB (עלה בבנייה 22.8).
 */
const routerMock = { push: vi.fn(), replace: replaceMock };
vi.mock("next/navigation", () => ({ useRouter: () => routerMock }));

import SessionPage from "@/app/session/page";
import { createProfile, setActiveProfileId } from "@/lib/profiles";
import { exportTelemetry, type TelemetryEvent } from "@/lib/telemetry";
import { loadMastery } from "@/lib/storage";

type AttemptEvent = Extract<TelemetryEvent, { t: "attempt" }>;

function seedChild() {
  const p = createProfile("ילדה", 8, "2018-01-01");
  setActiveProfileId(p.id);
  return p;
}

function attemptsOf(profileId: string): AttemptEvent[] {
  const all = JSON.parse(exportTelemetry(profileId)) as TelemetryEvent[];
  return all.filter((e): e is AttemptEvent => e.t === "attempt");
}

/** פותח סשן ומגיע למסך הפריט הראשון. */
async function startSession() {
  render(<SessionPage />);
  const start = await screen.findByRole("button", { name: "נתחיל" });
  fireEvent.click(start);
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "נתחיל" })).toBeNull(),
  );
}

/**
 * שולח את אותה תשובה **פעמיים באותו tick**.
 * מטפל בשני סוגי הפריטים: כפתורי-בחירה ושדה-קלט.
 */
function submitTwice(): void {
  const choices = screen.queryAllByRole("button", { name: /^\d+$/ });
  if (choices.length > 0) {
    fireEvent.click(choices[0]!);
    fireEvent.click(choices[0]!);
    return;
  }
  const input = screen.getByRole("spinbutton");
  fireEvent.change(input, { target: { value: "7" } });
  const form = input.closest("form")!;
  fireEvent.submit(form);
  fireEvent.submit(form);
}

beforeEach(() => {
  localStorage.clear();
  replaceMock.mockReset();
});

describe("🔴 סשן — לחיצה כפולה אינה יוצרת שני ניסיונות", () => {
  it("שתי שליחות מיידיות נספרות כניסיון אחד על אותו פריט", async () => {
    const profile = seedChild();
    await startSession();

    submitTwice();

    await waitFor(() =>
      expect(attemptsOf(profile.id).length).toBeGreaterThan(0),
    );

    const attempts = attemptsOf(profile.id);
    const firstItemId = attempts[0]!.itemId;
    const onFirstItem = attempts.filter((a) => a.itemId === firstItemId);
    // בלי השומר הסינכרוני כאן היו שניים — ניסיון-רפאים.
    expect(onFirstItem).toHaveLength(1);
  });

  it("קרדיט-השליטה נשמר — הניסיון נרשם כראשון", async () => {
    const profile = seedChild();
    await startSession();

    submitTwice();

    await waitFor(() =>
      expect(attemptsOf(profile.id).length).toBeGreaterThan(0),
    );

    const attempts = attemptsOf(profile.id);
    expect(attempts[0]!.attemptIdx).toBe(0);
    // ניסיון-רפאים היה מופיע כ-attemptIdx === 1 על אותו פריט.
    const firstItemId = attempts[0]!.itemId;
    expect(
      attempts.some((a) => a.itemId === firstItemId && a.attemptIdx === 1),
    ).toBe(false);
  });

  it("שמירת-השליטה אינה נכפלת — לכל היותר רשומה אחת", async () => {
    const profile = seedChild();
    await startSession();

    submitTwice();

    await waitFor(() =>
      expect(attemptsOf(profile.id).length).toBeGreaterThan(0),
    );

    // גיל 8 → add_sub_100 / multiplication (allowedSkillsForAge).
    // תשובה שגויה אינה כותבת שליטה עד הניסיון השלישי, ולכן הרף
    // הוא **לא יותר מאחת** — שתיים פירושו שהשמירה רצה פעמיים.
    const skills = ["add_sub_100", "multiplication"] as const;
    const total = skills
      .map((s) => loadMastery(profile.id, s).attempts.length)
      .reduce((a, b) => a + b, 0);
    expect(total).toBeLessThanOrEqual(1);
  });
});
