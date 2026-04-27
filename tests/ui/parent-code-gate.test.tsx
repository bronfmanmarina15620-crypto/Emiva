// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const originalLocation = window.location;
let hrefAssignments: string[] = [];

beforeEach(() => {
  localStorage.clear();
  hrefAssignments = [];
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      ...originalLocation,
      get href() {
        return originalLocation.href;
      },
      set href(value: string) {
        hrefAssignments.push(value);
      },
    },
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
});

import Home from "@/app/page";

describe("<Home> — parent code gate", () => {
  it("navigates straight to /parent when no gate code is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_PARENT_GATE_CODE", "");
    const user = userEvent.setup();
    render(<Home />);
    const btn = await screen.findByText("הורים");
    await user.click(btn);
    expect(hrefAssignments).toContain("/parent");
    expect(screen.queryByLabelText("קוד גישה")).not.toBeInTheDocument();
  });

  it("opens code input when gate code is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_PARENT_GATE_CODE", "right-code");
    const user = userEvent.setup();
    render(<Home />);
    const btn = await screen.findByText("הורים");
    await user.click(btn);
    expect(await screen.findByLabelText("קוד גישה")).toBeInTheDocument();
    expect(hrefAssignments).not.toContain("/parent");
  });

  it("wrong code clears input silently and does not navigate", async () => {
    vi.stubEnv("NEXT_PUBLIC_PARENT_GATE_CODE", "right-code");
    const user = userEvent.setup();
    render(<Home />);
    await user.click(await screen.findByText("הורים"));
    const input = (await screen.findByLabelText(
      "קוד גישה",
    )) as HTMLInputElement;
    await user.type(input, "wrong-code");
    expect(input.value).toBe("wrong-code");
    await user.keyboard("{Enter}");
    expect(input.value).toBe("");
    expect(hrefAssignments).not.toContain("/parent");
    expect(input).toBeInTheDocument();
  });

  it("correct code navigates to /parent", async () => {
    vi.stubEnv("NEXT_PUBLIC_PARENT_GATE_CODE", "right-code");
    const user = userEvent.setup();
    render(<Home />);
    await user.click(await screen.findByText("הורים"));
    const input = await screen.findByLabelText("קוד גישה");
    await user.type(input, "right-code");
    await user.keyboard("{Enter}");
    expect(hrefAssignments).toContain("/parent");
  });

  it("clicking 'הורים' a second time hides the input", async () => {
    vi.stubEnv("NEXT_PUBLIC_PARENT_GATE_CODE", "right-code");
    const user = userEvent.setup();
    render(<Home />);
    const btn = await screen.findByText("הורים");
    await user.click(btn);
    expect(await screen.findByLabelText("קוד גישה")).toBeInTheDocument();
    await user.click(btn);
    expect(screen.queryByLabelText("קוד גישה")).not.toBeInTheDocument();
  });
});
