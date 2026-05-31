// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const stableRouter = { push: pushMock, replace: replaceMock };

vi.mock("next/navigation", () => ({
  useRouter: () => stableRouter,
}));

import MeasurementPage from "@/app/parent/measurement/page";
import { setPin } from "@/lib/parent-auth";
import { createProfile } from "@/lib/profiles";
import { loadMeasurementHistory } from "@/lib/storage";
import { MEASUREMENT_TOTAL } from "@/lib/types";

beforeEach(() => {
  localStorage.clear();
  pushMock.mockReset();
  replaceMock.mockReset();
});

// Reads the displayed "X op Y = ?" prompt and computes the integer answer.
// add_sub_100 holdout items use this exact format.
function readArithmeticAnswerFromDOM(): number {
  const promptText = document.body.textContent ?? "";
  const m = promptText.match(/(\d+)\s*([+\-])\s*(\d+)\s*=\s*\?/);
  if (!m) throw new Error("could not parse arithmetic prompt from DOM");
  const a = parseInt(m[1]!, 10);
  const op = m[2]!;
  const b = parseInt(m[3]!, 10);
  return op === "+" ? a + b : a - b;
}

async function runFullArithmeticFlow(
  user: ReturnType<typeof userEvent.setup>,
  answerStrategy: "correct" | "always_wrong",
): Promise<void> {
  for (let i = 0; i < MEASUREMENT_TOTAL; i++) {
    const input = (await screen.findByRole("spinbutton")) as HTMLInputElement;
    await waitFor(() => expect(input).not.toBeDisabled());
    const correct = readArithmeticAnswerFromDOM();
    const toType =
      answerStrategy === "correct" ? String(correct) : String(correct + 999);
    await user.clear(input);
    await user.type(input, toType);
    await user.click(screen.getByRole("button", { name: "בדיקה" }));
  }
}

describe("<MeasurementPage> — route guard", () => {
  it("redirects to /parent when no PIN is set", async () => {
    render(<MeasurementPage />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/parent"));
  });
});

describe("<MeasurementPage> — pick stage", () => {
  beforeEach(async () => {
    await setPin("1234");
  });

  it("shows the framing copy 'סיבוב מהיר' rather than 'מבחן'", async () => {
    createProfile("Evelyn", 7);
    render(<MeasurementPage />);
    await screen.findByText(/סיבוב מהיר — מדידה חיצונית/);
    const allText = document.body.textContent ?? "";
    // Body header avoids the word "מבחן" in the framing line. (Buttons may
    // include the cue "מבחן חדש" on the summary stage, which is fine.)
    const header = screen.getByText(/10 שאלות שלא הופיעו/);
    expect(header.textContent ?? "").not.toContain("מבחן");
    expect(allText).toContain("בלי עזרות");
  });

  it("offers Evelyn the add_sub_100 measurable skill", async () => {
    createProfile("Evelyn", 7);
    render(<MeasurementPage />);
    expect(
      await screen.findByText("חיבור וחיסור עד 100"),
    ).toBeInTheDocument();
  });

  it("does not offer Evelyn skills she cannot reach (e.g. שברים)", async () => {
    createProfile("Evelyn", 7);
    render(<MeasurementPage />);
    await screen.findByText("חיבור וחיסור עד 100");
    expect(screen.queryByText("שברים")).not.toBeInTheDocument();
  });

  it("shows empty hint when no profile exists", async () => {
    render(<MeasurementPage />);
    expect(await screen.findByText(/עוד לא נוספו ילדות/)).toBeInTheDocument();
  });
});

describe("<MeasurementPage> — test stage (no scaffolding)", () => {
  beforeEach(async () => {
    await setPin("1234");
    createProfile("Evelyn", 7);
  });

  it("shows progress 'שאלה 1 מתוך 10' after starting", async () => {
    const user = userEvent.setup();
    render(<MeasurementPage />);
    await user.click(await screen.findByText("חיבור וחיסור עד 100"));
    expect(await screen.findByText("שאלה 1 מתוך 10")).toBeInTheDocument();
  });

  it("does NOT render any retry button (no 'נסי שוב' anywhere)", async () => {
    const user = userEvent.setup();
    render(<MeasurementPage />);
    await user.click(await screen.findByText("חיבור וחיסור עד 100"));
    await screen.findByText("שאלה 1 מתוך 10");
    expect(screen.queryByText(/נסי שוב/)).not.toBeInTheDocument();
  });

  it("does NOT render CPA explanation while the test is running", async () => {
    const user = userEvent.setup();
    render(<MeasurementPage />);
    await user.click(await screen.findByText("חיבור וחיסור עד 100"));
    const input = (await screen.findByRole("spinbutton")) as HTMLInputElement;
    await user.type(input, String(readArithmeticAnswerFromDOM() + 5));
    await user.click(screen.getByRole("button", { name: "בדיקה" }));
    expect(screen.queryByText(/הסבר/)).not.toBeInTheDocument();
    expect(screen.queryByText(/בואי נפתור יחד/)).not.toBeInTheDocument();
  });
});

describe("<MeasurementPage> — summary stage", () => {
  beforeEach(async () => {
    await setPin("1234");
  });

  it("10 correct answers → summary with 10/10 and 'עברה' verdict", async () => {
    const p = createProfile("Evelyn", 7);
    const user = userEvent.setup();
    render(<MeasurementPage />);
    await user.click(await screen.findByText("חיבור וחיסור עד 100"));
    await runFullArithmeticFlow(user, "correct");

    const summaryHeading = await screen.findByText(
      /סיכום — Evelyn · חיבור וחיסור עד 100/,
    );
    expect(summaryHeading).toBeInTheDocument();
    const summary = summaryHeading.closest("section")!;
    expect(within(summary).getByText("10")).toBeInTheDocument();
    expect(within(summary).getByText(/\/ 10/)).toBeInTheDocument();
    expect(within(summary).getByText("עברה")).toBeInTheDocument();

    const history = loadMeasurementHistory(p.id, "add_sub_100");
    expect(history.length).toBe(1);
    expect(history[0]?.score).toBe(10);
    expect(history[0]?.verdict).toBe("passed");
  }, 30_000);

  it("10 wrong answers → summary with 0/10 and 'כדאי לחזק' verdict", async () => {
    const p = createProfile("Evelyn", 7);
    const user = userEvent.setup();
    render(<MeasurementPage />);
    await user.click(await screen.findByText("חיבור וחיסור עד 100"));
    await runFullArithmeticFlow(user, "always_wrong");

    await screen.findByText(/סיכום — Evelyn · חיבור וחיסור עד 100/);
    expect(screen.getByText("כדאי לחזק")).toBeInTheDocument();

    const history = loadMeasurementHistory(p.id, "add_sub_100");
    expect(history[0]?.score).toBe(0);
    expect(history[0]?.verdict).toBe("false_mastery");
  }, 30_000);
});
