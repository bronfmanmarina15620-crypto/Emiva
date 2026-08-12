// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replaceMock = vi.fn();
const stableRouter = { push: vi.fn(), replace: replaceMock };

vi.mock("next/navigation", () => ({
  useRouter: () => stableRouter,
}));

import ParentFoundationPage from "@/app/parent/foundation/page";
import { createProfile } from "@/lib/profiles";
import { setPin } from "@/lib/parent-auth";
import { loadLog, monthKey } from "@/lib/foundation";

beforeEach(() => {
  localStorage.clear();
  replaceMock.mockReset();
});

async function setUpHousehold() {
  await setPin("1234");
  createProfile("אוולין", 7);
  createProfile("אמיליה", 9);
}

describe("<ParentFoundationPage> — גישה", () => {
  it("בלי PIN — מפנה חזרה לאזור ההורה", async () => {
    render(<ParentFoundationPage />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/parent"));
  });

  it("עם PIN — מציג את חמש השורות של §11.2", async () => {
    await setUpHousehold();
    render(<ParentFoundationPage />);
    expect(await screen.findByText(/😴 שינה/)).toBeInTheDocument();
    expect(screen.getByText(/📚 קריאה עצמאית/)).toBeInTheDocument();
    expect(screen.getByText(/🌱 זמן ריק/)).toBeInTheDocument();
    expect(screen.getByText(/🙂 אווירה/)).toBeInTheDocument();
    expect(screen.getByText(/📈 התקדמות/)).toBeInTheDocument();
  });

  it("שואל על כל בת בנפרד — בלי השוואה ביניהן", async () => {
    // guardrails §1: אף פעם לא מרנדרים מטריקה של בת אחת ליד השנייה
    // בתצוגת השוואה. כל בת מקבלת שורה משלה.
    await setUpHousehold();
    render(<ParentFoundationPage />);
    await screen.findByText(/📚 קריאה עצמאית/);
    expect(screen.getAllByText("אוולין").length).toBeGreaterThan(0);
    expect(screen.getAllByText("אמיליה").length).toBeGreaterThan(0);
  });
});

describe("<ParentFoundationPage> — מילוי ושמירה", () => {
  it("מילוי החודש נשמר ונטען מחדש", async () => {
    await setUpHousehold();
    const user = userEvent.setup();
    render(<ParentFoundationPage />);
    await screen.findByText(/😴 שינה/);

    await user.click(screen.getByRole("button", { name: "פחות מ-9" }));
    await user.click(screen.getByRole("button", { name: "שמרי" }));

    await waitFor(() => {
      const log = loadLog();
      expect(log.length).toBe(1);
      expect(log[0]?.month).toBe(monthKey());
      expect(log[0]?.sleep).toBe("no");
    });
  });

  it("שינה נמוכה מציפה את הדגל ש§2 קורא לו 'מקור הכל'", async () => {
    await setUpHousehold();
    const user = userEvent.setup();
    render(<ParentFoundationPage />);
    await screen.findByText(/😴 שינה/);

    await user.click(screen.getByRole("button", { name: "פחות מ-9" }));
    await user.click(screen.getByRole("button", { name: "שמרי" }));

    expect(await screen.findByText(/מקור הכל/)).toBeInTheDocument();
  });

  it("חודש תקין אינו מציף דגלים", async () => {
    await setUpHousehold();
    const user = userEvent.setup();
    render(<ParentFoundationPage />);
    await screen.findByText(/😴 שינה/);

    await user.click(screen.getByRole("button", { name: "שמרי" }));

    await waitFor(() => expect(loadLog().length).toBe(1));
    expect(screen.queryByText(/מה שכדאי לשים לב אליו/)).not.toBeInTheDocument();
  });

  it("אחרי שמירה הכפתור מציע לעדכן, לא לשמור מחדש", async () => {
    await setUpHousehold();
    const user = userEvent.setup();
    render(<ParentFoundationPage />);
    await screen.findByText(/😴 שינה/);

    await user.click(screen.getByRole("button", { name: "שמרי" }));

    expect(
      await screen.findByRole("button", { name: "עדכני את החודש" }),
    ).toBeInTheDocument();
  });
});

describe("<ParentFoundationPage> — מה שאסור להופיע", () => {
  it("אין ציון, אחוז או 'X מתוך 5'", async () => {
    // §2 אינו מדרג בתים. סיכום מספרי היה הופך את זה לתעודה להורה.
    await setUpHousehold();
    const user = userEvent.setup();
    const { container } = render(<ParentFoundationPage />);
    await screen.findByText(/😴 שינה/);

    await user.click(screen.getByRole("button", { name: "פחות מ-9" }));
    await user.click(screen.getByRole("button", { name: "לא היה" }));
    await user.click(screen.getByRole("button", { name: "שמרי" }));

    await waitFor(() => expect(loadLog().length).toBe(1));
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/\d+\s*מתוך\s*5/);
    expect(text).not.toMatch(/ציון/);
    expect(text).not.toMatch(/\d+%/);
  });

  it("אין streak או רצף חודשים (guardrails §4)", async () => {
    await setUpHousehold();
    const { container } = render(<ParentFoundationPage />);
    await screen.findByText(/😴 שינה/);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/רצף/);
    expect(text).not.toMatch(/streak/i);
  });

  it("שורת ההתקדמות נשלפת לבד — אין כפתורים למלא אותה", async () => {
    await setUpHousehold();
    render(<ParentFoundationPage />);
    await screen.findByText(/📈 התקדמות/);
    expect(
      screen.getByText(/השורה היחידה שהאפליקציה כבר יודעת לבד/),
    ).toBeInTheDocument();
  });
});
