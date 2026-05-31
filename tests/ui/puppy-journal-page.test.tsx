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

import PuppyJournalPage from "@/app/journal/puppy/page";
import { createProfile, setActiveProfileId } from "@/lib/profiles";
import { load as loadPuppy } from "@/lib/puppy-journal";

beforeEach(() => {
  localStorage.clear();
  pushMock.mockReset();
  replaceMock.mockReset();
});

describe("<PuppyJournalPage> — access control", () => {
  it("redirects to / when there is no active profile", async () => {
    render(<PuppyJournalPage />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
  });

  it("redirects to / when the active profile is younger than 9", async () => {
    const p = createProfile("Evelyn", 7);
    setActiveProfileId(p.id);
    render(<PuppyJournalPage />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
  });
});

describe("<PuppyJournalPage> — setup stage", () => {
  beforeEach(() => {
    const p = createProfile("Emilia", 9);
    setActiveProfileId(p.id);
  });

  it("renders the setup question for a brand-new journal", async () => {
    render(<PuppyJournalPage />);
    expect(
      await screen.findByText("איך קוראים לגור שלך?"),
    ).toBeInTheDocument();
  });

  it("submitting a name creates a journal and moves to the planning stage", async () => {
    const user = userEvent.setup();
    render(<PuppyJournalPage />);
    const input = await screen.findByPlaceholderText("שם הגור");
    await user.type(input, "באדי");
    await user.click(screen.getByRole("button", { name: "התחילי לתכנן" }));
    expect(await screen.findByText(/הגור שלי: באדי/)).toBeInTheDocument();
    expect(screen.getByText("מצב תכנון")).toBeInTheDocument();
  });
});

describe("<PuppyJournalPage> — planning stage", () => {
  beforeEach(async () => {
    const p = createProfile("Emilia", 9);
    setActiveProfileId(p.id);
    const user = userEvent.setup();
    render(<PuppyJournalPage />);
    const input = await screen.findByPlaceholderText("שם הגור");
    await user.type(input, "באדי");
    await user.click(screen.getByRole("button", { name: "התחילי לתכנן" }));
    await screen.findByText(/הגור שלי: באדי/);
  });

  it("shows the 'no commands yet' hint", () => {
    expect(
      screen.getByText(/עוד אין פקודות ביומן/),
    ).toBeInTheDocument();
  });

  it("adds a command via the form and persists it to storage", async () => {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "+ הוסיפי פקודה" }));
    await user.type(screen.getByPlaceholderText(/שם בעברית/), "שב");
    await user.type(screen.getByPlaceholderText(/Name in English/), "sit");
    await user.click(screen.getByRole("button", { name: "שמרי" }));

    expect(await screen.findByText("שב")).toBeInTheDocument();
    expect(screen.getByText(/sit/)).toBeInTheDocument();

    // The "תרגלנו" buttons are NOT shown in planning mode
    expect(screen.queryByText("תרגלנו ✓")).not.toBeInTheDocument();
  });

  it("starting training switches to active mode and exposes the practice buttons", async () => {
    const user = userEvent.setup();
    // Add a command first
    await user.click(screen.getByRole("button", { name: "+ הוסיפי פקודה" }));
    await user.type(screen.getByPlaceholderText(/שם בעברית/), "שב");
    await user.type(screen.getByPlaceholderText(/Name in English/), "sit");
    await user.click(screen.getByRole("button", { name: "שמרי" }));

    await user.click(screen.getByRole("button", { name: "התחלתי לאמן היום" }));
    expect(await screen.findByText(/מתאמנים — יום/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "תרגלנו ✓" })).toBeInTheDocument();
  });
});

describe("<PuppyJournalPage> — active stage logging", () => {
  it("logging a successful attempt updates the success rate", async () => {
    const p = createProfile("Emilia", 9);
    setActiveProfileId(p.id);
    const user = userEvent.setup();
    render(<PuppyJournalPage />);

    // Setup
    await user.type(
      await screen.findByPlaceholderText("שם הגור"),
      "באדי",
    );
    await user.click(screen.getByRole("button", { name: "התחילי לתכנן" }));

    // Add a command
    await user.click(
      await screen.findByRole("button", { name: "+ הוסיפי פקודה" }),
    );
    await user.type(screen.getByPlaceholderText(/שם בעברית/), "שב");
    await user.type(screen.getByPlaceholderText(/Name in English/), "sit");
    await user.click(screen.getByRole("button", { name: "שמרי" }));

    // Start training
    await user.click(screen.getByRole("button", { name: "התחלתי לאמן היום" }));

    // Log a success
    await user.click(
      await screen.findByRole("button", { name: "תרגלנו ✓" }),
    );

    // After one attempt: 1 of 30 trainings, success 100%
    expect(
      await screen.findByText(/1 מתוך 30 אימונים · הצלחה 100%/),
    ).toBeInTheDocument();

    // Storage was updated
    const stored = loadPuppy(p.id);
    expect(stored?.commands[0]?.attempts.length).toBe(1);
    expect(stored?.commands[0]?.attempts[0]?.success).toBe(true);
  });
});

describe("<PuppyJournalPage> — free notes", () => {
  it("adds and renders a free note", async () => {
    const p = createProfile("Emilia", 9);
    setActiveProfileId(p.id);
    const user = userEvent.setup();
    render(<PuppyJournalPage />);

    await user.type(
      await screen.findByPlaceholderText("שם הגור"),
      "באדי",
    );
    await user.click(screen.getByRole("button", { name: "התחילי לתכנן" }));

    const noteTextarea = await screen.findByPlaceholderText(/מה רצית לכתוב היום/);
    await user.type(noteTextarea, "באדי היה ממוקד היום");
    await user.click(screen.getByRole("button", { name: "שמרי הערה" }));

    expect(
      await screen.findByText("באדי היה ממוקד היום"),
    ).toBeInTheDocument();
  });
});
