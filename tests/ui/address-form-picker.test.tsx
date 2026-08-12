// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();
const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

import NewProfilePage from "@/app/profiles/new/page";
import { loadProfiles } from "@/lib/profiles";

beforeEach(() => {
  localStorage.clear();
  pushMock.mockReset();
  replaceMock.mockReset();
});

/**
 * GENDER-INCLUSIVE-001 G1 — the signup question.
 *
 * Phrased as a question about LANGUAGE, not about sex ("איך לפנות אליך?"),
 * per the Israeli government standard. "Prefer not to say" is mandatory: it
 * is both a courtesy and the mechanism by which existing profiles keep
 * working without anyone being forced to answer.
 */
describe("<NewProfilePage> — address form", () => {
  it("asks about language, never about sex", async () => {
    render(<NewProfilePage />);
    expect(await screen.findByText("איך לפנות אליך?")).toBeInTheDocument();
    expect(screen.queryByText(/מה המין/)).not.toBeInTheDocument();
    expect(screen.queryByText(/מגדר/)).not.toBeInTheDocument();
  });

  it("offers a neutral option alongside the two gendered ones", async () => {
    render(<NewProfilePage />);
    expect(await screen.findByLabelText(/בלשון נקבה/)).toBeInTheDocument();
    expect(screen.getByLabelText(/בלשון זכר/)).toBeInTheDocument();
    expect(screen.getByLabelText(/בלי להעדיף/)).toBeInTheDocument();
  });

  it("stores the choice on the new profile", async () => {
    const user = userEvent.setup();
    render(<NewProfilePage />);
    await user.type(await screen.findByRole("textbox"), "איתי");
    await user.clear(screen.getByRole("spinbutton"));
    await user.type(screen.getByRole("spinbutton"), "8");
    await user.click(screen.getByLabelText(/בלשון זכר/));
    await user.click(screen.getByRole("button", { name: "שמירה" }));

    await waitFor(() => {
      expect(loadProfiles()[0]?.addressForm).toBe("masculine");
    });
  });

  it("leaves it unset when the question is skipped", async () => {
    const user = userEvent.setup();
    render(<NewProfilePage />);
    await user.type(await screen.findByRole("textbox"), "דנה");
    await user.clear(screen.getByRole("spinbutton"));
    await user.type(screen.getByRole("spinbutton"), "8");
    await user.click(screen.getByRole("button", { name: "שמירה" }));

    await waitFor(() => expect(loadProfiles().length).toBe(1));
    // Unset — not silently defaulted to a gender.
    expect(loadProfiles()[0]?.addressForm).toBeUndefined();
  });
});
