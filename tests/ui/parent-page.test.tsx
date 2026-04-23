// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const stableRouter = { push: pushMock, replace: replaceMock };

vi.mock("next/navigation", () => ({
  useRouter: () => stableRouter,
}));

import ParentEntry from "@/app/parent/page";
import { hasPinSet, setPin } from "@/lib/parent-auth";

beforeEach(() => {
  localStorage.clear();
  pushMock.mockReset();
  replaceMock.mockReset();
});

async function typePin(
  user: ReturnType<typeof userEvent.setup>,
  fields: HTMLElement[],
  values: string[],
) {
  for (let i = 0; i < fields.length; i++) {
    await user.clear(fields[i]!);
    if (values[i]!.length > 0) {
      await user.type(fields[i]!, values[i]!);
    }
  }
}

describe("<ParentEntry> — setup mode (first visit)", () => {
  it("renders setup screen when no PIN stored", async () => {
    render(<ParentEntry />);
    await waitFor(() =>
      expect(screen.getByText("הגדרת קוד להורה")).toBeInTheDocument(),
    );
  });

  it("rejects mismatched confirmation", async () => {
    const user = userEvent.setup();
    render(<ParentEntry />);
    await screen.findByText("הגדרת קוד להורה");
    const inputs = screen.getAllByDisplayValue("");
    await typePin(user, inputs.slice(0, 2), ["1234", "5678"]);
    await user.click(screen.getByRole("button", { name: "שמרי קוד" }));
    expect(await screen.findByText(/הקודים לא תואמים/)).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("rejects PIN shorter than 4 digits", async () => {
    const user = userEvent.setup();
    render(<ParentEntry />);
    await screen.findByText("הגדרת קוד להורה");
    const inputs = screen.getAllByDisplayValue("");
    await typePin(user, inputs.slice(0, 2), ["12", "12"]);
    // required attribute blocks submit; click should not route
    await user.click(screen.getByRole("button", { name: "שמרי קוד" }));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("matching PIN stores hash and navigates to dashboard", async () => {
    const user = userEvent.setup();
    render(<ParentEntry />);
    await screen.findByText("הגדרת קוד להורה");
    const inputs = screen.getAllByDisplayValue("");
    await typePin(user, inputs.slice(0, 2), ["1234", "1234"]);
    await user.click(screen.getByRole("button", { name: "שמרי קוד" }));
    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/parent/dashboard"),
    );
    expect(hasPinSet()).toBe(true);
  });
});

describe("<ParentEntry> — login mode", () => {
  it("renders login when PIN already set", async () => {
    await setPin("1234");
    render(<ParentEntry />);
    await waitFor(() =>
      expect(screen.getByText("כניסת הורה")).toBeInTheDocument(),
    );
  });

  it("correct PIN navigates to dashboard", async () => {
    await setPin("1234");
    const user = userEvent.setup();
    render(<ParentEntry />);
    await screen.findByText("כניסת הורה");
    const input = screen.getAllByDisplayValue("")[0]!;
    await user.type(input, "1234");
    await user.click(screen.getByRole("button", { name: "כניסה" }));
    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/parent/dashboard"),
    );
  });

  it("wrong PIN shows error with remaining attempts", async () => {
    await setPin("1234");
    const user = userEvent.setup();
    render(<ParentEntry />);
    await screen.findByText("כניסת הורה");
    const input = screen.getAllByDisplayValue("")[0]!;
    await user.type(input, "9999");
    await user.click(screen.getByRole("button", { name: "כניסה" }));
    expect(await screen.findByText(/2 ניסיונות נותרו/)).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("three wrong PINs trigger math-gate", async () => {
    await setPin("1234");
    const user = userEvent.setup();
    render(<ParentEntry />);
    await screen.findByText("כניסת הורה");
    for (let i = 0; i < 3; i++) {
      const input = screen.getAllByDisplayValue("")[0]!;
      await user.type(input, "9999");
      await user.click(screen.getByRole("button", { name: "כניסה" }));
    }
    await waitFor(() =>
      expect(screen.getByText("שאלת אימות")).toBeInTheDocument(),
    );
    expect(screen.getByText(/× \d+ = \?/)).toBeInTheDocument();
  });
});

describe("<ParentEntry> — math-gate", () => {
  it("wrong answer locks the area", async () => {
    await setPin("1234");
    const user = userEvent.setup();
    render(<ParentEntry />);
    await screen.findByText("כניסת הורה");
    for (let i = 0; i < 3; i++) {
      const input = screen.getAllByDisplayValue("")[0]!;
      await user.type(input, "9999");
      await user.click(screen.getByRole("button", { name: "כניסה" }));
    }
    await screen.findByText("שאלת אימות");
    const gateInput = screen.getByRole("spinbutton");
    await user.type(gateInput, "0");
    await user.click(screen.getByRole("button", { name: "בדוק ואפס קוד" }));
    await waitFor(() =>
      expect(screen.getByText("האזור נעול זמנית")).toBeInTheDocument(),
    );
  });

  it("correct answer clears PIN and returns to setup", async () => {
    await setPin("1234");
    const user = userEvent.setup();
    render(<ParentEntry />);
    await screen.findByText("כניסת הורה");
    for (let i = 0; i < 3; i++) {
      const input = screen.getAllByDisplayValue("")[0]!;
      await user.type(input, "9999");
      await user.click(screen.getByRole("button", { name: "כניסה" }));
    }
    const prompt = await screen.findByText(/× \d+ = \?/);
    const match = prompt.textContent!.match(/(\d+) × (\d+) = \?/);
    const a = Number(match![1]);
    const b = Number(match![2]);
    const answer = a * b;
    const gateInput = screen.getByRole("spinbutton");
    await user.type(gateInput, String(answer));
    await user.click(screen.getByRole("button", { name: "בדוק ואפס קוד" }));
    await waitFor(() =>
      expect(screen.getByText("הגדרת קוד להורה")).toBeInTheDocument(),
    );
    expect(hasPinSet()).toBe(false);
  });
});
