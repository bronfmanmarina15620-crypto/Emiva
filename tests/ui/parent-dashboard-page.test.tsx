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

import ParentDashboard from "@/app/parent/dashboard/page";
import { setPin } from "@/lib/parent-auth";
import { createProfile } from "@/lib/profiles";
import { saveMastery } from "@/lib/storage";
import { emptyMastery, recordAttempt, incrementSession } from "@/lib/mastery";
import { saveBelief } from "@/lib/parent-belief";

beforeEach(() => {
  localStorage.clear();
  pushMock.mockReset();
  replaceMock.mockReset();
});

describe("<ParentDashboard> — route guard", () => {
  it("redirects to /parent if no PIN set", async () => {
    render(<ParentDashboard />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/parent"));
  });
});

describe("<ParentDashboard> — empty state", () => {
  it("renders with no profiles → empty hint", async () => {
    await setPin("1234");
    render(<ParentDashboard />);
    await waitFor(() =>
      expect(screen.getByText("האזור להורים")).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/עוד לא נוספו ילדות/),
    ).toBeInTheDocument();
  });
});

describe("<ParentDashboard> — with profiles", () => {
  beforeEach(async () => {
    await setPin("1234");
    createProfile("Evelyn", 7);
    createProfile("Emilia", 9);
  });

  it("renders a card per daughter", async () => {
    render(<ParentDashboard />);
    await screen.findAllByText(/Evelyn|Emilia/);
    // Names appear in both weekly digest and the card header → 2 per daughter
    expect(screen.getAllByText("Evelyn").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Emilia").length).toBeGreaterThanOrEqual(1);
  });

  it("fresh profile without activity renders 'כדאי לשים לב'", async () => {
    render(<ParentDashboard />);
    await screen.findAllByText(/Evelyn/);
    expect(screen.getAllByText("כדאי לשים לב").length).toBeGreaterThan(0);
  });

  it("renders 2 skill tiles for age-7 profile (add_sub, multiplication)", async () => {
    render(<ParentDashboard />);
    await screen.findAllByText(/Evelyn/);
    expect(screen.getAllByText("חיבור וחיסור עד 100").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("לוח הכפל").length).toBeGreaterThanOrEqual(1);
  });

  it("renders 4 skill tiles for age-9 profile", async () => {
    render(<ParentDashboard />);
    await screen.findAllByText(/Emilia/);
    expect(screen.getAllByText("שברים").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("חיבור וחיסור עד 1000").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("חילוק ארוך").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("בעיות מילוליות").length).toBeGreaterThanOrEqual(1);
  });
});

describe("<ParentDashboard> — belief form", () => {
  beforeEach(async () => {
    await setPin("1234");
    createProfile("Evelyn", 7);
  });

  it("submits belief → display swaps to comparison block", async () => {
    render(<ParentDashboard />);
    const user = userEvent.setup();
    await screen.findAllByText(/Evelyn/);
    const textbox = await screen.findByPlaceholderText(/השבוע הרגשתי ש/);
    await user.type(textbox, "נראית נהנית");
    await user.click(screen.getByRole("button", { name: "שמרי" }));
    expect(await screen.findByText(/כתבת/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/השבוע הרגשתי ש/)).not.toBeInTheDocument();
  });

  it("kind selector defaults to 'ביצועים'; can switch to 'רגש'", async () => {
    render(<ParentDashboard />);
    const user = userEvent.setup();
    await screen.findAllByText(/Evelyn/);
    const radios = screen.getAllByRole("radio");
    const perf = radios.find(
      (r) => (r as HTMLInputElement).checked,
    ) as HTMLInputElement;
    expect(perf).toBeDefined();
    const feeling = screen.getAllByLabelText(/על רגש/)[0]!;
    await user.click(feeling);
    expect((feeling as HTMLInputElement).checked).toBe(true);
  });
});

describe("<ParentDashboard> — belief-comparison display variants", () => {
  it("feeling-kind note shows activity (sessions/minutes), not accuracy %", async () => {
    await setPin("1234");
    const p = createProfile("Evelyn", 7);
    const yesterday = Date.now() - 86_400_000;
    saveBelief(p.id, "נראית עצובה", "feeling", yesterday);
    let m = emptyMastery("add_sub_100");
    m = incrementSession(m, Date.now() - 3600_000);
    m = recordAttempt(m, "i1", true, Date.now() - 1800_000);
    saveMastery(p.id, m);
    render(<ParentDashboard />);
    await screen.findByText(/לפני.*ימים כתבת.*על רגש/);
    // No "% נכון-בראשון" phrase should appear for feeling comparison
    const txt = document.body.textContent || "";
    const hasAccuracy = /% נכון-בראשון/.test(
      txt.split("מאז")[1] ?? "",
    );
    expect(hasAccuracy).toBe(false);
  });
});
