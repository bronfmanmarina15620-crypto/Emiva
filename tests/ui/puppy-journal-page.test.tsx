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

  // T8ב — MyLevel §6.3 gives the 7-year-old an explicit role ("העוזרת"),
  // so she must NOT hit the age gate any more. This is the regression the
  // task exists to fix: before it, Eva was blocked in code.
  it("a 7-year-old is admitted as the helper, not blocked", async () => {
    const p = createProfile("Evelyn", 7);
    setActiveProfileId(p.id);
    render(<PuppyJournalPage />);
    expect(
      await screen.findByText(/את העוזרת של הפרויקט/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/יומן הגור פתוח מגיל/)).not.toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("shows an age-gate message (no redirect) below the helper age", async () => {
    const p = createProfile("Tiny", 6);
    setActiveProfileId(p.id);
    render(<PuppyJournalPage />);
    expect(await screen.findByText("יומן הגור פתוח מגיל 7")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
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

  it("submitting a name creates a journal and opens stage 1 (learning)", async () => {
    const user = userEvent.setup();
    render(<PuppyJournalPage />);
    const input = await screen.findByPlaceholderText("שם הגור");
    await user.type(input, "באדי");
    await user.click(screen.getByRole("button", { name: "התחילי לתכנן" }));
    expect(await screen.findByText(/הגור שלי: באדי/)).toBeInTheDocument();
    expect(screen.getByText(/שלב 1 — לומדות את השיטה/)).toBeInTheDocument();
  });
});

// §6.2 stage 1 — watch videos, check the three principles, choose commands.
describe("<PuppyJournalPage> — stage 1: learning the method", () => {
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

  it("offers the three method principles from the document", () => {
    expect(screen.getByText(/חיזוק חיובי/)).toBeInTheDocument();
    expect(screen.getByText(/עקביות/)).toBeInTheDocument();
    expect(screen.getByText(/סבלנות/)).toBeInTheDocument();
  });

  it("training cannot start before the method is learned and a command chosen", () => {
    const start = screen.getByRole("button", {
      name: "סיימנו ללמוד — מתחילות לאמן",
    });
    expect(start).toBeDisabled();
  });

  it("checking all three principles and picking a command unlocks training", async () => {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /חיזוק חיובי/ }));
    await user.click(screen.getByRole("button", { name: /עקביות/ }));
    await user.click(screen.getByRole("button", { name: /סבלנות/ }));
    await user.click(screen.getByRole("button", { name: "+ שב" }));

    const start = await screen.findByRole("button", {
      name: "סיימנו ללמוד — מתחילות לאמן",
    });
    expect(start).toBeEnabled();
    await user.click(start);
    expect(await screen.findByText(/שלב 2 — מתאמנות/)).toBeInTheDocument();
  });
});

describe("<PuppyJournalPage> — logging attempts per context", () => {
  async function reachTrainingStage(user: ReturnType<typeof userEvent.setup>) {
    await user.type(await screen.findByPlaceholderText("שם הגור"), "באדי");
    await user.click(screen.getByRole("button", { name: "התחילי לתכנן" }));
    await user.click(await screen.findByRole("button", { name: /חיזוק חיובי/ }));
    await user.click(screen.getByRole("button", { name: /עקביות/ }));
    await user.click(screen.getByRole("button", { name: /סבלנות/ }));
    await user.click(screen.getByRole("button", { name: "+ שב" }));
    await user.click(
      screen.getByRole("button", { name: "סיימנו ללמוד — מתחילות לאמן" }),
    );
    await screen.findByText(/שלב 2 — מתאמנות/);
  }

  it("logging a successful attempt updates the success rate and storage", async () => {
    const p = createProfile("Emilia", 9);
    setActiveProfileId(p.id);
    const user = userEvent.setup();
    render(<PuppyJournalPage />);
    await reachTrainingStage(user);

    await user.click(await screen.findByRole("button", { name: "תרגלנו ✓" }));

    expect(
      await screen.findByText(/1 מתוך 30 אימונים · הצלחה 100%/),
    ).toBeInTheDocument();

    const stored = loadPuppy(p.id);
    expect(stored?.commands[0]?.attempts.length).toBe(1);
    expect(stored?.commands[0]?.attempts[0]?.success).toBe(true);
    // §6.2 stage 3 — every attempt records where it happened. Home is the
    // default because stage 2 training happens at home.
    expect(stored?.commands[0]?.attempts[0]?.context).toBe("home");
  });

  it("choosing a context records the attempt there and advances to stage 3", async () => {
    const p = createProfile("Emilia", 9);
    setActiveProfileId(p.id);
    const user = userEvent.setup();
    render(<PuppyJournalPage />);
    await reachTrainingStage(user);

    await user.click(screen.getByRole("button", { name: "בחוץ" }));
    await user.click(screen.getByRole("button", { name: "תרגלנו ✓" }));

    const stored = loadPuppy(p.id);
    expect(stored?.commands[0]?.attempts[0]?.context).toBe("outside");
    // Working outside the home is what moves the project into stage 3.
    expect(await screen.findByText(/שלב 3 — בודקות בכל מקום/)).toBeInTheDocument();
  });
});

// §6.3 — Eva helps on Emilia's journal; she does not get a separate puppy.
describe("<PuppyJournalPage> — the helper (Eva)", () => {
  it("sees a waiting message when the owner has not started a journal", async () => {
    const eva = createProfile("Evelyn", 7);
    setActiveProfileId(eva.id);
    render(<PuppyJournalPage />);
    expect(await screen.findByText("הפרויקט עוד לא התחיל")).toBeInTheDocument();
  });

  it("opens the owner's journal and may log attempts but not add commands", async () => {
    const emilia = createProfile("Emilia", 9);
    const eva = createProfile("Evelyn", 7);

    // Emilia sets up the project first.
    setActiveProfileId(emilia.id);
    const user = userEvent.setup();
    const owner = render(<PuppyJournalPage />);
    await user.type(await screen.findByPlaceholderText("שם הגור"), "באדי");
    await user.click(screen.getByRole("button", { name: "התחילי לתכנן" }));
    await user.click(await screen.findByRole("button", { name: /חיזוק חיובי/ }));
    await user.click(screen.getByRole("button", { name: /עקביות/ }));
    await user.click(screen.getByRole("button", { name: /סבלנות/ }));
    await user.click(screen.getByRole("button", { name: "+ שב" }));
    await user.click(
      screen.getByRole("button", { name: "סיימנו ללמוד — מתחילות לאמן" }),
    );
    await screen.findByText(/שלב 2 — מתאמנות/);
    // §6.3 — Emilia invites Eva onto the project. Since LAUNCH-PUBLIC-001 D1
    // the link is explicit: without the invitation Eva gets her own empty
    // journal rather than whichever one happens to sit on the device.
    await user.click(screen.getByRole("button", { name: "להזמין" }));
    await screen.findByRole("button", { name: "מוזמנת ✓" });
    owner.unmount();

    // Now Eva opens the journal.
    setActiveProfileId(eva.id);
    render(<PuppyJournalPage />);

    expect(await screen.findByText(/הגור שלי: באדי/)).toBeInTheDocument();
    expect(screen.getByText(/Evelyn, את העוזרת/)).toBeInTheDocument();
    // She may log the result of a training session (§6.3 "רושמת ביומן")...
    expect(screen.getByRole("button", { name: "תרגלנו ✓" })).toBeInTheDocument();
    // ...but the project stays Emilia's: no adding or deleting commands.
    expect(
      screen.queryByRole("button", { name: "+ הוסיפי פקודה" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "מחיקת פקודה" }),
    ).not.toBeInTheDocument();

    // Her logged attempt lands on Emilia's journal, stamped with her name.
    await user.click(screen.getByRole("button", { name: "תרגלנו ✓" }));
    await waitFor(() => {
      const stored = loadPuppy(emilia.id);
      expect(stored?.commands[0]?.attempts[0]?.loggedBy).toBe("Evelyn");
    });
  });

  it("can add breed research facts (§6.3 independent research)", async () => {
    const emilia = createProfile("Emilia", 9);
    const eva = createProfile("Evelyn", 7);
    setActiveProfileId(emilia.id);
    const user = userEvent.setup();
    const owner = render(<PuppyJournalPage />);
    await user.type(await screen.findByPlaceholderText("שם הגור"), "באדי");
    await user.click(screen.getByRole("button", { name: "התחילי לתכנן" }));
    await screen.findByText(/הגור שלי: באדי/);
    // The helper link is explicit since LAUNCH-PUBLIC-001 D1.
    await user.click(screen.getByRole("button", { name: "להזמין" }));
    await screen.findByRole("button", { name: "מוזמנת ✓" });
    owner.unmount();

    setActiveProfileId(eva.id);
    render(<PuppyJournalPage />);

    const factBox = await screen.findByPlaceholderText(/עובדה שגילית/);
    await user.type(factBox, "לברדורים מגיעים מקנדה");
    await user.click(screen.getByRole("button", { name: "הוסיפי עובדה" }));

    expect(
      await screen.findByText("לברדורים מגיעים מקנדה"),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(loadPuppy(emilia.id)?.breedFacts?.[0]?.loggedBy).toBe("Evelyn");
    });
  });

  // LAUNCH-PUBLIC-001 D1 — the leak that opening to the public exposes.
  // The helper used to be handed the FIRST owner-aged journal found on the
  // device, whoever it belonged to. With one family that is the intended
  // "one puppy, one journal" behaviour; with two families sharing a tablet
  // it hands a child another family's journal, with write access.
  // The link must be explicit, never guessed by scanning.
  it("does NOT open an unrelated owner's journal (no device-wide scan)", async () => {
    // A child from another household already keeps a journal on this device.
    const stranger = createProfile("Noa", 9);
    setActiveProfileId(stranger.id);
    const user = userEvent.setup();
    const strangerView = render(<PuppyJournalPage />);
    await user.type(await screen.findByPlaceholderText("שם הגור"), "רקסי");
    await user.click(screen.getByRole("button", { name: "התחילי לתכנן" }));
    await screen.findByText(/הגור שלי: רקסי/);
    strangerView.unmount();

    // An unrelated 7-year-old opens the journal. She is not linked to Noa.
    const otherChild = createProfile("Dana", 7);
    setActiveProfileId(otherChild.id);
    render(<PuppyJournalPage />);

    // She must not see the stranger's puppy.
    expect(await screen.findByText("הפרויקט עוד לא התחיל")).toBeInTheDocument();
    expect(screen.queryByText(/רקסי/)).not.toBeInTheDocument();
    // And nothing she does may reach the stranger's journal.
    expect(loadPuppy(stranger.id)?.puppyName).toBe("רקסי");
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
    await screen.findByText(/הגור שלי: באדי/);

    const noteTextarea = await screen.findByPlaceholderText(/מה רצית לכתוב היום/);
    await user.type(noteTextarea, "באדי היה ממוקד היום");
    await user.click(screen.getByRole("button", { name: "שמרי הערה" }));

    expect(
      await screen.findByText("באדי היה ממוקד היום"),
    ).toBeInTheDocument();
  });
});
