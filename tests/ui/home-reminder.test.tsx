// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const pushMock = vi.fn();
const stableRouter = { push: pushMock };

vi.mock("next/navigation", () => ({
  useRouter: () => stableRouter,
}));

import Home from "@/app/page";
import { logEvent } from "@/lib/telemetry";

beforeEach(() => {
  localStorage.clear();
  pushMock.mockReset();
});

describe("<Home> — parent reminder dot", () => {
  it('"הורים" link is present', async () => {
    render(<Home />);
    const link = await screen.findByText("הורים");
    expect(link).toBeInTheDocument();
  });

  it("no dot when no dashboard_opened events", async () => {
    render(<Home />);
    await screen.findByText("הורים");
    expect(
      screen.queryByLabelText("תזכורת: לא נכנסת מזמן"),
    ).not.toBeInTheDocument();
  });

  it("no dot when last open was recent (< 14 days)", async () => {
    logEvent("_parent", {
      t: "dashboard_opened",
      at: Date.now() - 5 * 86_400_000,
    });
    render(<Home />);
    await screen.findByText("הורים");
    expect(
      screen.queryByLabelText("תזכורת: לא נכנסת מזמן"),
    ).not.toBeInTheDocument();
  });

  it("dot appears when last open was > 14 days ago", async () => {
    logEvent("_parent", {
      t: "dashboard_opened",
      at: Date.now() - 20 * 86_400_000,
    });
    render(<Home />);
    await waitFor(() =>
      expect(
        screen.getByLabelText("תזכורת: לא נכנסת מזמן"),
      ).toBeInTheDocument(),
    );
  });
});
